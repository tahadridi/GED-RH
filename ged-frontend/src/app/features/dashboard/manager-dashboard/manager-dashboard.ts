import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { ApiService } from '../../../core/services/api.service';
import { AnnouncementService } from '../../../core/services/announcement.service';
import { DocumentService } from '../../../core/services/document.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { Employee } from '../../../core/models/employee.model';
import { environment } from '../../../../environments/environment';
import { LucideUsers, LucideFolderOpen, LucideAlertCircle, LucideCheckCircle, LucideXCircle, LucideFileText, LucideList, LucideBell, LucideChevronDown, LucideChevronRight } from '@lucide/angular';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideUsers, LucideFolderOpen, LucideAlertCircle, LucideCheckCircle, LucideXCircle, LucideFileText, LucideList, LucideBell, LucideChevronDown, LucideChevronRight],
  templateUrl: './manager-dashboard.html'
})
export class ManagerDashboard implements OnInit {
  apiUrl = environment.apiUrl;
  team = signal<Employee[]>([]);
  loading = signal(true);

  reclamations = signal<any[]>([]);
  recentDocs = signal<any[]>([]);
  expandedDocGroups = signal<Set<string>>(new Set());
  announcements = signal<any[]>([]);

  pendingReclamations = computed(() => this.reclamations().filter(r => r.status === 'PENDING'));
  approvedReclamations = computed(() => this.reclamations().filter(r => r.status === 'APPROVED'));
  rejectedReclamations = computed(() => this.reclamations().filter(r => r.status === 'REJECTED'));

  recentGroups = computed(() => {
    const map = new Map<string, { employeeId: string; employeeFirstName: string; employeeLastName: string; employeeMatricule: string; employeeHasPhoto: boolean; documents: any[] }>();
    for (const doc of this.recentDocs()) {
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
    private authService: AuthService,
    private employeeService: EmployeeService,
    private api: ApiService,
    private announcementService: AnnouncementService,
    private documentService: DocumentService,
    private webSocketService: WebSocketService
  ) {}

  get userName() {
    const p = this.authService.profile();
    return p ? `${p.firstName} ${p.lastName}` : '';
  }

  async ngOnInit() {
    await this.authService.ready();
    try {
      const [emps, reclas, docs] = await Promise.all([
        this.employeeService.list(),
        this.api.get<any[]>('/reclamations/team'),
        this.documentService.search({})
      ]);
      this.team.set(emps);
      this.reclamations.set(reclas);
      this.recentDocs.set(docs.slice(0, 10));
      this.expandAllDocGroups();
    } finally {
      this.loading.set(false);
    }
    this.loadAnnouncements();
    this.webSocketService.onReclamationUpdate(() => this.refreshReclamations());
  }

  private async loadAnnouncements() {
    try {
      this.announcements.set(await this.announcementService.list());
    } catch (e) {
      console.warn('Announcements not available', e);
    }
  }

  async refreshReclamations() {
    try {
      const reclas = await this.api.get<any[]>('/reclamations/team');
      this.reclamations.set(reclas);
    } catch (e) {
      console.error('Failed to refresh reclamations', e);
    }
  }

  toggleDocGroup(employeeId: string) {
    const set = new Set(this.expandedDocGroups());
    if (set.has(employeeId)) set.delete(employeeId);
    else set.add(employeeId);
    this.expandedDocGroups.set(set);
  }

  expandAllDocGroups() {
    const set = new Set(this.recentGroups().map(g => g.employeeId));
    this.expandedDocGroups.set(set);
  }

  async openDocument(doc: any) {
    try {
      await this.documentService.open(doc.id, doc.name);
    } catch (e) {
      console.error('Failed to open document', e);
    }
  }

  statusLabel(s: string) {
    const m: Record<string, string> = { ACTIVE: 'Actif', INACTIVE: 'Inactif', ON_LEAVE: 'En congé', TERMINATED: 'Terminé' };
    return m[s] ?? s;
  }

  reclamationStatusLabel(s: string) {
    const m: Record<string, string> = { PENDING: 'En attente', APPROVED: 'Approuvée', REJECTED: 'Rejetée' };
    return m[s] ?? s;
  }

  priorityLabel(p: string) {
    const m: Record<string, string> = { FAIBLE: 'Faible', MOYENNE: 'Moyenne', HAUTE: 'Haute', CRITIQUE: 'Critique' };
    return m[p] ?? p;
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
