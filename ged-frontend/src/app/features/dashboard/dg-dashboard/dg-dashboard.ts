import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { DocumentService } from '../../../core/services/document.service';
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';
import { LucideUsers, LucideFileText, LucideAlertCircle } from '@lucide/angular';

@Component({
  selector: 'app-dg-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideUsers, LucideFileText, LucideAlertCircle],
  templateUrl: './dg-dashboard.html'
})
export class DgDashboard implements OnInit {
  apiUrl = environment.apiUrl;

  allEmployees = signal<any[]>([]);
  allDocuments = signal<any[]>([]);
  reclamations = signal<any[]>([]);
  recentDocuments = signal<any[]>([]);
  loading = signal(true);
  expandedRecentGroups = signal<Set<string>>(new Set());


  totalActiveEmployees = computed(() => this.allEmployees().filter(e => e.status === 'ACTIVE').length);
  totalEmployees = computed(() => this.allEmployees().length);
  totalDocuments = computed(() => this.allDocuments().length);

  documentsThisMonth = computed(() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    return this.allDocuments().filter(d => {
      const dt = new Date(d.createdAt);
      return dt.getMonth() === m && dt.getFullYear() === y;
    }).length;
  });

  departmentsCount = computed(() => {
    const depts = new Set(this.allEmployees().map(e => e.department).filter(Boolean));
    return depts.size;
  });

  pendingReclamations = computed(() => this.reclamations().filter(r => r.status === 'PENDING'));

  reclamationsByDay = computed(() => {
    const counts = new Map<string, number>();
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      counts.set(key, 0);
    }
    for (const r of this.reclamations()) {
      const d = new Date(r.createdAt);
      const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      if (counts.has(key)) {
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    const maxCount = Math.max(...Array.from(counts.values()), 1);
    return Array.from(counts.entries()).map(([date, count]) => ({
      date,
      count,
      pct: (count / maxCount) * 100
    }));
  });

  departmentBreakdown = computed(() => {
    const empDept = new Map<string, number>();
    for (const e of this.allEmployees()) {
      const dept = e.department || 'Sans département';
      empDept.set(dept, (empDept.get(dept) || 0) + 1);
    }
    const docDept = new Map<string, number>();
    const empIdToDept = new Map<string, string>();
    for (const e of this.allEmployees()) {
      empIdToDept.set(e.id, e.department || 'Sans département');
    }
    for (const d of this.allDocuments()) {
      const dept = empIdToDept.get(d.employeeId) || 'Sans département';
      docDept.set(dept, (docDept.get(dept) || 0) + 1);
    }
    const maxEmp = Math.max(...Array.from(empDept.values()), 1);
    return Array.from(empDept.entries())
      .map(([dept, empCount]) => ({
        name: dept,
        employeeCount: empCount,
        docCount: docDept.get(dept) || 0,
        pct: (empCount / maxEmp) * 100
      }))
      .sort((a, b) => b.employeeCount - a.employeeCount);
  });

  docTypeDistribution = computed(() => {
    const counts = new Map<string, number>();
    for (const d of this.allDocuments()) {
      const t = d.type || 'OTHER';
      counts.set(t, (counts.get(t) || 0) + 1);
    }
    const total = this.allDocuments().length || 1;
    return Array.from(counts.entries())
      .map(([type, count]) => ({
        type,
        label: this.documentTypeLabel(type),
        count,
        pct: (count / total) * 100
      }))
      .sort((a, b) => b.count - a.count);
  });

  recentDocGroups = computed(() => {
    const map = new Map<string, { employeeId: string; employeeFirstName: string; employeeLastName: string; employeeMatricule: string; employeeHasPhoto: boolean; documents: any[] }>();
    for (const doc of this.recentDocuments()) {
      const key = doc.employeeId || 'unknown';
      if (!map.has(key)) {
        map.set(key, {
          employeeId: key,
          employeeFirstName: doc.employeeFirstName || '',
          employeeLastName: doc.employeeLastName || '',
          employeeMatricule: doc.employeeMatricule || '',
          employeeHasPhoto: doc.employeeHasPhoto || false,
          documents: []
        });
      }
      map.get(key)!.documents.push(doc);
    }
    return Array.from(map.values());
  });

  Math = Math;

  constructor(
    private authService: AuthService,
    private employeeService: EmployeeService,
    private documentService: DocumentService,
    private apiService: ApiService
  ) {}

  get userName() {
    const p = this.authService.profile();
    return p ? `${p.firstName} ${p.lastName}` : '';
  }

  async ngOnInit() {
    await this.authService.ready();

    // Load employees and documents unconditionally
    try {
      const emps = await this.employeeService.list();
      this.allEmployees.set(emps);
    } catch (e) {
      console.error('Failed to load employees', e);
    }

    try {
      const docs = await this.documentService.search({});
      this.allDocuments.set(docs);

      const sorted = [...docs].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ).slice(0, 6);
      this.recentDocuments.set(sorted);
      this.expandAllRecentGroups();
    } catch (e) {
      console.error('Failed to load documents', e);
    }

    // Load reclamations independently
    try {
      const reclas = await this.apiService.get<any[]>('/reclamations');
      this.reclamations.set(reclas || []);
    } catch (e) {
      console.warn('Reclamations not available for DG', e);
    }

    this.loading.set(false);
  }

  toggleRecentGroup(employeeId: string) {
    const set = new Set(this.expandedRecentGroups());
    if (set.has(employeeId)) set.delete(employeeId);
    else set.add(employeeId);
    this.expandedRecentGroups.set(set);
  }

  expandAllRecentGroups() {
    const set = new Set(this.recentDocGroups().map(g => g.employeeId));
    this.expandedRecentGroups.set(set);
  }

  async openDocument(doc: any) {
    try {
      await this.documentService.open(doc.id, doc.name);
    } catch (e) {
      console.error('Failed to open document', e);
    }
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = { ACTIVE: 'Actif', INACTIVE: 'Inactif', ON_LEAVE: 'En congé', TERMINATED: 'Terminé' };
    return m[s] ?? s;
  }

  documentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      EMPLOYMENT_CONTRACT: 'Contrat', PAYSLIP: 'Paie', LEAVE_REQUEST: 'Congé',
      EVALUATION: 'Évaluation', TRAINING: 'Formation', ADMINISTRATIVE: 'Admin',
      PERSONAL_FILE: 'Dossier', OTHER: 'Autre', INVOICE: 'Facture', CONTRACT: 'Contrat'
    };
    return labels[type] ?? type;
  }

  formatDate(d: string) {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
