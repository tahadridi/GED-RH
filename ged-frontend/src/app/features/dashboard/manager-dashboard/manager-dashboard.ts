import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EmployeeService, OrgContextResponse } from '../../../core/services/employee.service';
import { ApiService } from '../../../core/services/api.service';
import { AnnouncementService } from '../../../core/services/announcement.service';
import { DocumentService } from '../../../core/services/document.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { Employee } from '../../../core/models/employee.model';
import { environment } from '../../../../environments/environment';
import { LucideUsers, LucideFolderOpen, LucideAlertCircle, LucideCheckCircle, LucideXCircle, LucideFileText, LucideList, LucideBell, LucideChevronDown, LucideChevronRight, LucideGitBranch } from '@lucide/angular';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideUsers, LucideFolderOpen, LucideAlertCircle, LucideCheckCircle, LucideXCircle, LucideFileText, LucideList, LucideBell, LucideChevronDown, LucideChevronRight, LucideGitBranch],
  templateUrl: './manager-dashboard.html',
  styles: [`
    .org-card { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; border: 1px solid #e5e7eb; background: #fff; min-width: 200px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); cursor: pointer; transition: box-shadow .15s; }
    .org-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .org-card-self { border-color: #3b82f6; background: #eff6ff; box-shadow: 0 0 0 2px rgba(59,130,246,0.15); }
    .org-card-manager { border-color: #dbeafe; background: #f0f7ff; }
    .org-avatar { width: 36px; height: 36px; border-radius: 50%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
    .org-avatar-self { width: 40px; height: 40px; }
    .org-initials { font-weight: 600; color: #6b7280; font-size: 11px; }
    .org-info { min-width: 0; }
    .org-name { font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px; }
    .org-matricule { font-size: 11px; color: #3b82f6; font-weight: 500; }
    .org-position { font-size: 11px; color: #6b7280; }
    .org-line-down { width: 2px; height: 24px; background: #cbd5e1; flex-shrink: 0; }
    .org-line-up { width: 2px; height: 16px; background: #cbd5e1; flex-shrink: 0; }
    .org-card-self .org-name { color: #2563eb; }
  `]
})
export class ManagerDashboard implements OnInit {
  apiUrl = environment.apiUrl;
  team = signal<Employee[]>([]);
  loading = signal(true);
  orgContext = signal<OrgContextResponse | null>(null);
  orgLoading = signal(true);

  get orgBoss() { return this.orgContext()?.manager ?? null; }

  reclamations = signal<any[]>([]);
  recentDocs = signal<any[]>([]);
  expandedDocGroups = signal<Set<string>>(new Set());
  announcements = signal<any[]>([]);

  teamFiltered = computed(() => {
    const p = this.authService.profile();
    const empId = p?.employeeId;
    return this.team().filter(e => e.id !== empId);
  });

  selfNode = computed(() => {
    const p = this.authService.profile();
    if (!p) return null;
    return {
      id: p.employeeId ?? p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      matricule: p.matricule ?? '',
      position: '',
      department: '',
      photoUrl: p.photoUrl
    };
  });

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
    this.loadOrgContext();
    this.webSocketService.onReclamationUpdate(() => this.refreshReclamations());
  }

  private async loadOrgContext() {
    const profile = this.authService.profile();
    if (!profile?.employeeId) { this.orgLoading.set(false); return; }
    try {
      this.orgContext.set(await this.employeeService.getOrgContext(profile.employeeId));
    } catch (e) {
      console.warn('Failed to load org context', e);
    } finally {
      this.orgLoading.set(false);
    }
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
