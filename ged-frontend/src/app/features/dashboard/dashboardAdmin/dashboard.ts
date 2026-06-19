import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EmployeeService } from '../../../core/services/employee.service';
import { DocumentService } from '../../../core/services/document.service';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styles: ``
})
export class Dashboard implements OnInit {
  apiUrl = environment.apiUrl;
  // Signals
  totalEmployees = signal(0);
  totalDocuments = signal(0);
  recentDocuments = signal<any[]>([]);
  allEmployees = signal<any[]>([]);
  allDocuments = signal<any[]>([]);
  loading = signal(true);
  expandedRecentGroups = signal<Set<string>>(new Set());
  storageBytes = signal(0);
  storageObjectCount = signal(0);
  diskTotal = signal(0);
  diskFree = signal(0);
  reclamations = signal<any[]>([]);
  loadingReclamations = signal(false);

  pendingReclamations = computed(() => this.reclamations().filter(r => r.status === 'PENDING'));
  recentPendingReclamations = computed(() => this.pendingReclamations().slice(0, 3));

  recentGroups = computed(() => {
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

  constructor(
    private employeeService: EmployeeService,
    private documentService: DocumentService,
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router
  ) {}

  get userEmail() { return this.authService.user()?.email ?? ''; }
  get userInitial() { return this.userEmail.charAt(0).toUpperCase(); }

  // Greeting method
  greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }

  // Computed values
  newEmployeesThisMonth(): number {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return this.allEmployees().filter(emp => {
      if (!emp.hireDate) return false;
      const d = new Date(emp.hireDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
  }

  documentsThisMonth(): number {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return this.allDocuments().filter(doc => {
      const docDate = new Date(doc.createdAt);
      return docDate.getMonth() === currentMonth && docDate.getFullYear() === currentYear;
    }).length;
  }

  pendingDocuments(): number {
    return this.allDocuments().filter(doc => doc.status === 'PENDING' || doc.status === 'en attente').length;
  }

  recentEmployees() {
    return this.allEmployees()
      .filter(emp => emp.hireDate)
      .sort((a, b) => {
        const dateA = new Date(a.hireDate);
        const dateB = new Date(b.hireDate);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 3);
  }

  documentDistribution() {
    const counts = new Map<string, number>();
    for (const doc of this.allDocuments()) {
      const type = doc.type;
      counts.set(type, (counts.get(type) || 0) + 1);
    }
    const total = this.allDocuments().length;
    return Array.from(counts.entries()).map(([type, count]) => ({
      name: this.documentTypeLabel(type),
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }));
  }

  // Refresh data
  async refreshData() {
    this.loading.set(true);
    try {
      const [employees, docs] = await Promise.all([
        this.employeeService.list(),
        this.documentService.search({})
      ]);
      this.allEmployees.set(employees);
      this.allDocuments.set(docs);
      this.totalEmployees.set(employees.filter(e => e.status === 'ACTIVE').length);
      this.totalDocuments.set(docs.length);
      this.recentDocuments.set(docs.slice(0, 5));
      this.expandAllRecentGroups();
    } catch (e) {
      console.error('Refresh failed', e);
    } finally {
      this.loading.set(false);
    }
  }

  async refreshStorageStats() {
    try {
      const [stats, disk] = await Promise.all([
        this.apiService.get<{ totalSize: number; objectCount: number }>('/storage/stats'),
        this.apiService.get<{ totalSpace: number; usedSpace: number; freeSpace: number }>('/storage/disk')
      ]);
      this.storageBytes.set(stats.totalSize);
      this.storageObjectCount.set(stats.objectCount);
      this.diskTotal.set(disk.totalSpace);
      this.diskFree.set(disk.freeSpace);
    } catch (e) {
      console.error('Failed to load storage stats', e);
    }
  }

  get storageUsed(): string {
    return formatBytes(this.storageBytes());
  }

  get storageFree(): string {
    return formatBytes(this.diskFree());
  }

  get storageTotal(): string {
    return formatBytes(this.diskTotal());
  }

  get storagePercentage(): number {
    const total = this.diskTotal();
    if (total === 0) return 0;
    return Math.min(100, +(this.storageBytes() / total * 100).toFixed(1));
  }

  async loadReclamations() {
    this.loadingReclamations.set(true);
    try {
      const all = await this.authService.getReclamations();
      this.reclamations.set(all);
    } catch (e) {
      console.error('Failed to load reclamations', e);
    } finally {
      this.loadingReclamations.set(false);
    }
  }

  statusLabel(s: string): string {
    switch (s) {
      case 'PENDING': return 'En attente';
      case 'APPROVED': return 'Approuvé';
      case 'REJECTED': return 'Rejeté';
      default: return s;
    }
  }

  priorityLabel(p: string): string {
    switch (p) {
      case 'FAIBLE': return 'Faible';
      case 'MOYENNE': return 'Moyenne';
      case 'HAUTE': return 'Haute';
      case 'CRITIQUE': return 'Critique';
      default: return p || 'Moyenne';
    }
  }

  priorityClass(p: string): string {
    return 'priority-' + (p || 'moyenne').toLowerCase();
  }

  async ngOnInit() {
    await this.authService.ready();
    await Promise.all([
      this.refreshData(),
      this.refreshStorageStats(),
      this.loadReclamations()
    ]);
  }

  toggleRecentGroup(employeeId: string) {
    const set = new Set(this.expandedRecentGroups());
    if (set.has(employeeId)) set.delete(employeeId);
    else set.add(employeeId);
    this.expandedRecentGroups.set(set);
  }

  expandAllRecentGroups() {
    const set = new Set(this.recentGroups().map(g => g.employeeId));
    this.expandedRecentGroups.set(set);
  }

  async openDocument(doc: any) {
    try {
      await this.documentService.open(doc.id, doc.name);
    } catch (e) {
      console.error('Failed to open document', e);
    }
  }

  documentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      EMPLOYMENT_CONTRACT: 'Contrat', PAYSLIP: 'Paie', LEAVE_REQUEST: 'Congé',
      EVALUATION: 'Évaluation', TRAINING: 'Formation', ADMINISTRATIVE: 'Admin',
      PERSONAL_FILE: 'Dossier', OTHER: 'Autre', INVOICE: 'Facture', CONTRACT: 'Contrat'
    };
    return labels[type] ?? type;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}