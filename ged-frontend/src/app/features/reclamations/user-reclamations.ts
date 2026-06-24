import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { LucideSend, LucideCheck, LucideX, LucideRefreshCw } from '@lucide/angular';

@Component({
  selector: 'app-user-reclamations',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideSend, LucideCheck, LucideX, LucideRefreshCw],
  template: `
    <div class="page">
      <h2>Réclamations</h2>

      <!-- Gradient divider -->
      <div class="mb-6 h-px bg-gradient-to-r from-blue-400 via-purple-400 to-transparent"></div>

      <!-- Submit form (hidden for admin) -->
      <div *ngIf="!isAdmin" class="card">
        <h3>Nouvelle réclamation</h3>
        <p class="desc">Envoyez une réclamation à votre manager.</p>
        <div class="form-group">
          <label>Titre</label>
          <input [(ngModel)]="title" type="text" placeholder="Titre de la réclamation" class="form-input">
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea [(ngModel)]="message" rows="5" placeholder="Décrivez votre réclamation en détail..." class="form-input"></textarea>
        </div>
        <div class="form-group" style="max-width: 200px;">
          <label>Priorité</label>
          <select [(ngModel)]="priority" class="form-input">
            <option value="FAIBLE">Faible</option>
            <option value="MOYENNE">Moyenne</option>
            <option value="HAUTE">Haute</option>
            <option value="CRITIQUE">Critique</option>
          </select>
        </div>
        <button (click)="submit()" [disabled]="!title || !message || submitting" class="btn-submit">
          <svg lucideSend class="w-4 h-4"></svg>
          {{ submitting ? 'Envoi...' : 'Envoyer' }}
        </button>
        <p *ngIf="submitSuccess" class="text-green-600 text-sm mt-2">Réclamation envoyée avec succès</p>
        <p *ngIf="submitError" class="text-red-500 text-sm mt-2">{{ submitError }}</p>
      </div>

      <!-- Admin: department statistics -->
      <div *ngIf="isAdmin" class="card">
        <div class="card-header">
          <h3>Répartition par département</h3>
          <button (click)="loadDeptStats()" class="btn-refresh"><svg lucideRefreshCw class="w-4 h-4" [class.spin]="loadingDeptStats()"></svg></button>
        </div>
        <div *ngIf="loadingDeptStats()" class="text-gray-500 text-sm py-4 text-center">Chargement...</div>
        <div *ngIf="!loadingDeptStats() && deptStats().length === 0" class="text-gray-400 text-sm py-4 text-center">Aucune réclamation</div>
        <div *ngIf="deptStats().length > 0" class="stats-grid">
          <div *ngFor="let s of deptStats()" class="stat-card">
            <h4 class="stat-dept">{{ s.department }}</h4>
            <div class="stat-row">
              <span class="stat-label">Total</span>
              <span class="stat-value">{{ s.total }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label pending">En attente</span>
              <span class="stat-value pending">{{ s.pending }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label approved">Approuvées</span>
              <span class="stat-value approved">{{ s.approved }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label rejected">Rejetées</span>
              <span class="stat-value rejected">{{ s.rejected }}</span>
            </div>
          </div>
        </div>

      </div>
      <!-- Admin: all reclamations -->
      <div *ngIf="isAdmin" class="card">
        <div class="card-header">
          <h3>Toutes les réclamations</h3>
          <button (click)="loadAll()" class="btn-refresh"><svg lucideRefreshCw class="w-4 h-4" [class.spin]="loadingAll()"></svg></button>
        </div>
        <div *ngIf="loadingAll()" class="text-gray-500 text-sm py-4 text-center">Chargement...</div>
        <div *ngIf="!loadingAll() && allReclamations().length === 0" class="text-gray-400 text-sm py-4 text-center">Aucune réclamation</div>
        <table *ngIf="allReclamations().length > 0" class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Employé</th>
              <th>Matricule</th>
              <th>Priorité</th>
              <th>Titre</th>
              <th>Statut</th>
              <th>Traité par</th>
              <th *ngIf="hasPending()">Actions</th>
            </tr>
          </thead>
          <tbody>
            <ng-container *ngFor="let r of allReclamations()">
            <tr>
              <td class="text-sm">{{ formatDate(r.createdAt) }}</td>
              <td class="font-medium">{{ r.employeeFirstName }} {{ r.employeeLastName }}</td>
              <td class="text-sm text-gray-600">{{ r.employeeMatricule || '—' }}</td>
              <td><span [class]="'priority-badge ' + priorityClass(r.priority)">{{ priorityLabel(r.priority) }}</span></td>
              <td class="text-sm">{{ r.title }}</td>
              <td><span [class]="'badge ' + statusClass(r.status)">{{ statusLabel(r.status) }}</span></td>
              <td class="text-sm text-gray-600">{{ r.processedByName || '—' }}</td>
              <td *ngIf="r.status === 'PENDING'">
                <div class="action-btns">
                  <button (click)="approve(r.id)" class="btn-approve" title="Approuver"><svg lucideCheck class="w-4 h-4"></svg></button>
                  <button (click)="openReject(r.id)" class="btn-reject" title="Rejeter"><svg lucideX class="w-4 h-4"></svg></button>
                </div>
              </td>
            </tr>
            <tr *ngIf="r.status === 'REJECTED' && r.rejectionReason">
              <td colspan="8" class="rejection-detail">
                <span class="rejection-label">Motif : {{ rejectionLabel(r.rejectionReason) }}</span>
                <span *ngIf="r.rejectionComment" class="rejection-comment"> — {{ r.rejectionComment }}</span>
              </td>
            </tr>
            </ng-container>
          </tbody>
        </table>
        <p *ngIf="adminError" class="text-red-500 text-sm mt-2">{{ adminError }}</p>
      </div>

      <!-- Manager: team reclamations -->
      <div *ngIf="isManager && !isAdmin" class="card">
        <div class="card-header">
          <h3>Réclamations de mon équipe</h3>
          <button (click)="loadTeam()" class="btn-refresh"><svg lucideRefreshCw class="w-4 h-4" [class.spin]="loadingTeam()"></svg></button>
        </div>
        <div *ngIf="loadingTeam()" class="text-gray-500 text-sm py-4 text-center">Chargement...</div>
        <div *ngIf="!loadingTeam() && teamReclamations().length === 0" class="text-gray-400 text-sm py-4 text-center">Aucune réclamation de votre équipe</div>
        <table *ngIf="teamReclamations().length > 0" class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Employé</th>
              <th>Matricule</th>
              <th>Priorité</th>
              <th>Titre</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <ng-container *ngFor="let r of teamReclamations()">
            <tr>
              <td class="text-sm">{{ formatDate(r.createdAt) }}</td>
              <td class="font-medium">{{ r.employeeFirstName }} {{ r.employeeLastName }}</td>
              <td class="text-sm text-gray-600">{{ r.employeeMatricule || '—' }}</td>
              <td><span [class]="'priority-badge ' + priorityClass(r.priority)">{{ priorityLabel(r.priority) }}</span></td>
              <td class="text-sm">{{ r.title }}</td>
              <td><span [class]="'badge ' + statusClass(r.status)">{{ statusLabel(r.status) }}</span></td>
              <td *ngIf="r.status === 'PENDING'">
                <div class="action-btns">
                  <button (click)="approveTeam(r.id)" class="btn-approve" title="Approuver"><svg lucideCheck class="w-4 h-4"></svg></button>
                  <button (click)="openReject(r.id)" class="btn-reject" title="Rejeter"><svg lucideX class="w-4 h-4"></svg></button>
                </div>
              </td>
              <td *ngIf="r.status !== 'PENDING'" class="text-sm text-gray-600">{{ r.processedByName || '—' }}</td>
            </tr>
            <tr *ngIf="r.status === 'REJECTED' && r.rejectionReason">
              <td colspan="7" class="rejection-detail">
                <span class="rejection-label">Motif : {{ rejectionLabel(r.rejectionReason) }}</span>
                <span *ngIf="r.rejectionComment" class="rejection-comment"> — {{ r.rejectionComment }}</span>
              </td>
            </tr>
            </ng-container>
          </tbody>
        </table>
      </div>

      <!-- My reclamations (hidden for admin) -->
      <div *ngIf="!isAdmin" class="card">
        <h3>Mes réclamations</h3>
        <div *ngIf="myReclamations().length === 0" class="text-gray-400 text-sm py-4 text-center">Aucune réclamation</div>
        <table *ngIf="myReclamations().length > 0" class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Titre</th>
              <th>Priorité</th>
              <th>Statut</th>
              <th>Traité par</th>
            </tr>
          </thead>
          <tbody>
            <ng-container *ngFor="let r of myReclamations()">
            <tr>
              <td class="text-sm">{{ formatDate(r.createdAt) }}</td>
              <td class="text-sm">{{ r.title }}</td>
              <td><span [class]="'priority-badge ' + priorityClass(r.priority)">{{ priorityLabel(r.priority) }}</span></td>
              <td><span [class]="'badge ' + statusClass(r.status)">{{ statusLabel(r.status) }}</span></td>
              <td class="text-sm text-gray-600">{{ r.processedByName || '—' }}</td>
            </tr>
            <tr *ngIf="r.status === 'REJECTED' && r.rejectionReason">
              <td colspan="5" class="rejection-detail">
                <span class="rejection-label">Motif : {{ rejectionLabel(r.rejectionReason) }}</span>
                <span *ngIf="r.rejectionComment" class="rejection-comment"> — {{ r.rejectionComment }}</span>
              </td>
            </tr>
            </ng-container>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Reject modal -->
    <div *ngIf="showRejectModal" class="modal-overlay" (click)="showRejectModal = false">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <h3>Motif du rejet</h3>
        <div class="reject-options">
          <label *ngFor="let opt of rejectOptions" class="reject-option">
            <input type="radio" name="rejectReason" [value]="opt.value" [(ngModel)]="rejectReason">
            <span>{{ opt.label }}</span>
          </label>
        </div>
        <div class="form-group" *ngIf="rejectReason === 'AUTRE'" style="margin-top: 0.75rem;">
          <label>Commentaire</label>
          <textarea [(ngModel)]="rejectComment" rows="3" placeholder="Précisez le motif..." class="form-input"></textarea>
        </div>
        <div class="modal-actions">
          <button (click)="showRejectModal = false" class="btn-cancel">Annuler</button>
          <button (click)="confirmReject()" class="btn-reject-submit" [disabled]="!rejectReason">Confirmer le rejet</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 2rem; max-width: 960px; }
    .page h2 { font-size: 1.5rem; font-weight: 700; color: #111827; margin: 0 0 1.5rem 0; }
    .card {
      background: white; border-radius: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 1.5rem; margin-bottom: 1.5rem;
    }
    .card h3 { font-size: 1.125rem; font-weight: 600; color: #111827; margin: 0 0 0.5rem 0; }
    .desc { font-size: 0.875rem; color: #6b7280; margin: 0 0 1rem 0; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
    .form-input {
      width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem;
      font-size: 0.875rem; outline: none; box-sizing: border-box;
    }
    .form-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.2); }
    textarea.form-input { resize: vertical; font-family: inherit; }
    .btn-submit {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.5rem 1.25rem; border: none; border-radius: 0.5rem;
      background: #3b82f6; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer;
    }
    .btn-submit:hover { background: #2563eb; }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

    .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
    .card-header h3 { margin-bottom: 0; }
    .btn-refresh { background: none; border: 1px solid #d1d5db; border-radius: 0.375rem; padding: 0.375rem; cursor: pointer; color: #6b7280; }
    .btn-refresh:hover { background: #f3f4f6; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .table th { text-align: left; padding: 0.5rem 0.75rem; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb; }
    .table td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #f3f4f6; }
    .table tr:last-child td { border-bottom: none; }
    .max-w-xs { max-width: 200px; }
    .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
    .badge-pending { background: #fef3c7; color: #92400e; }
    .badge-approved { background: #d1fae5; color: #065f46; }
    .badge-rejected { background: #fee2e2; color: #991b1b; }

    .priority-badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
    .priority-faible { background: #e0e7ff; color: #3730a3; }
    .priority-moyenne { background: #fef3c7; color: #92400e; }
    .priority-haute { background: #fed7aa; color: #9a3412; }
    .priority-critique { background: #fee2e2; color: #991b1b; }

    .action-btns { display: flex; gap: 0.375rem; }
    .btn-approve, .btn-reject { padding: 0.25rem 0.5rem; border: none; border-radius: 0.25rem; cursor: pointer; }
    .btn-approve { background: #d1fae5; color: #065f46; }
    .btn-approve:hover { background: #a7f3d0; }
    .btn-reject { background: #fee2e2; color: #991b1b; }
    .btn-reject:hover { background: #fecaca; }

    .rejection-detail {
      font-size: 0.8125rem;
      color: #991b1b;
      background: #fef2f2;
      padding: 0.5rem 0.75rem !important;
      border-bottom: 1px solid #fecaca !important;
    }
    .rejection-label { font-weight: 600; }
    .rejection-comment { font-weight: 400; }

    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
    .stat-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1rem; }
    .stat-dept { font-size: 0.875rem; font-weight: 700; color: #111827; margin: 0 0 0.75rem 0; }
    .stat-row { display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; font-size: 0.8125rem; }
    .stat-label { color: #6b7280; }
    .stat-value { font-weight: 700; }
    .stat-label.pending, .stat-value.pending { color: #92400e; }
    .stat-label.approved, .stat-value.approved { color: #065f46; }
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex;
      align-items: center; justify-content: center; z-index: 1000;
    }
    .modal-card {
      background: white; border-radius: 0.75rem; padding: 1.5rem; width: 100%; max-width: 420px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .modal-card h3 { font-size: 1.125rem; font-weight: 700; margin: 0 0 1rem 0; color: #111827; }
    .reject-options { display: flex; flex-direction: column; gap: 0.5rem; }
    .reject-option {
      display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; cursor: pointer; padding: 0.375rem 0;
    }
    .reject-option input { accent-color: #3b82f6; }
    .modal-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem; }
    .btn-cancel {
      padding: 0.5rem 1rem; border: 1px solid #d1d5db; border-radius: 0.5rem;
      background: white; font-size: 0.875rem; cursor: pointer; color: #374151;
    }
    .btn-cancel:hover { background: #f3f4f6; }
    .btn-reject-submit {
      padding: 0.5rem 1rem; border: none; border-radius: 0.5rem;
      background: #dc2626; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer;
    }
    .btn-reject-submit:hover { background: #b91c1c; }
    .btn-reject-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class UserReclamations implements OnInit, OnDestroy {
  title = '';
  message = '';
  priority = 'MOYENNE';
  submitting = false;
  submitSuccess = false;
  submitError = '';

  isAdmin = false;
  isManager = false;
  allReclamations = signal<any[]>([]);
  loadingAll = signal(false);
  adminError = '';

  deptStats = signal<any[]>([]);
  loadingDeptStats = signal(false);

  teamReclamations = signal<any[]>([]);
  loadingTeam = signal(false);
  teamError = '';

  myReclamations = signal<any[]>([]);

  showRejectModal = false;
  rejectTargetId = '';
  rejectReason = '';
  rejectComment = '';
  rejectOptions = [
    { value: 'HORS_PERIMETRE', label: 'Hors périmètre' },
    { value: 'INFOS_INSUFFISANTES', label: 'Informations insuffisantes' },
    { value: 'DEJA_TRAITEE', label: 'Réclamation déjà traitée' },
    { value: 'NON_JUSTIFIEE', label: 'Non justifiée' },
    { value: 'AUTRE', label: 'Autre' },
  ];

  constructor(
    private authService: AuthService,
    private webSocketService: WebSocketService
  ) {}

  async ngOnInit() {
    await this.authService.ready();
    const p = this.authService.profile();
    this.isAdmin = p?.roles?.includes('ADMINISTRATOR') ?? false;
    this.isManager = p?.roles?.includes('MANAGER') ?? false;
    if (this.isAdmin) {
      this.loadAll();
      this.loadDeptStats();
    } else if (this.isManager) {
      this.loadTeam();
    }
    try {
      this.myReclamations.set(await this.authService.getMyReclamations());
    } catch (_) {}

    this.webSocketService.onReclamationUpdate(() => {
      this.refreshData();
    });
  }

  ngOnDestroy() {}

  private async refreshData() {
    if (this.isAdmin) {
      await Promise.all([this.loadAll(), this.loadDeptStats()]);
    } else if (this.isManager) {
      await this.loadTeam();
    }
    try {
      this.myReclamations.set(await this.authService.getMyReclamations());
    } catch (_) {}
  }

  async submit() {
    if (!this.title || !this.message) return;
    this.submitting = true;
    this.submitSuccess = false;
    this.submitError = '';
    try {
      await this.authService.createReclamation(this.title, this.message, undefined, this.priority);
      this.submitSuccess = true;
      this.title = '';
      this.message = '';
      this.priority = 'MOYENNE';
      setTimeout(() => this.submitSuccess = false, 4000);
      try {
        this.myReclamations.set(await this.authService.getMyReclamations());
      } catch (_) {}
      if (this.isAdmin) await this.loadAll();
    } catch (e: any) {
      this.submitError = e?.error?.message || 'Erreur lors de l\'envoi';
    } finally {
      this.submitting = false;
    }
  }

  async loadAll() {
    this.loadingAll.set(true);
    this.adminError = '';
    try {
      this.allReclamations.set(await this.authService.getReclamations());
    } catch (e: any) {
      this.adminError = 'Erreur de chargement';
    } finally {
      this.loadingAll.set(false);
    }
  }

  async loadTeam() {
    this.loadingTeam.set(true);
    this.teamError = '';
    try {
      this.teamReclamations.set(await this.authService.getTeamReclamations());
    } catch (e: any) {
      this.teamError = 'Erreur de chargement';
    } finally {
      this.loadingTeam.set(false);
    }
  }

  async loadDeptStats() {
    this.loadingDeptStats.set(true);
    try {
      this.deptStats.set(await this.authService.getReclamationStatsByDepartment());
    } catch (_) {}
    finally { this.loadingDeptStats.set(false); }
  }

  hasPending() { return this.allReclamations().some(r => r.status === 'PENDING'); }

  async approve(id: string) {
    await this.authService.approveReclamation(id);
    await this.loadAll();
  }

  async reject(id: string) {
    await this.authService.rejectReclamation(id);
    await this.loadAll();
  }

  async approveTeam(id: string) {
    await this.authService.approveReclamation(id);
    await this.loadTeam();
  }

  async rejectTeam(id: string) {
    await this.authService.rejectReclamation(id);
    await this.loadTeam();
  }

  openReject(id: string) {
    this.rejectTargetId = id;
    this.rejectReason = '';
    this.rejectComment = '';
    this.showRejectModal = true;
  }

  async confirmReject() {
    if (!this.rejectReason || !this.rejectTargetId) return;
    this.showRejectModal = false;
    const id = this.rejectTargetId;
    const reason = this.rejectReason;
    const comment = this.rejectReason === 'AUTRE' ? this.rejectComment : '';
    await this.authService.rejectReclamation(id, reason, comment);
    if (this.isAdmin) await this.loadAll();
    else await this.loadTeam();
  }

  statusClass(s: string) { return 'badge-' + s.toLowerCase(); }
  statusLabel(s: string) {
    switch (s) {
      case 'PENDING': return 'En attente';
      case 'APPROVED': return 'Approuvé';
      case 'REJECTED': return 'Rejeté';
      default: return s;
    }
  }

  priorityClass(p: string) {
    return 'priority-' + (p || 'moyenne').toLowerCase();
  }
  priorityLabel(p: string) {
    switch (p) {
      case 'FAIBLE': return 'Faible';
      case 'MOYENNE': return 'Moyenne';
      case 'HAUTE': return 'Haute';
      case 'CRITIQUE': return 'Critique';
      default: return p || 'Moyenne';
    }
  }

  formatDate(d: string) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  rejectionLabel(reason: string): string {
    switch (reason) {
      case 'HORS_PERIMETRE': return 'Hors périmètre';
      case 'INFOS_INSUFFISANTES': return 'Informations insuffisantes';
      case 'DEJA_TRAITEE': return 'Réclamation déjà traitée';
      case 'NON_JUSTIFIEE': return 'Non justifiée';
      case 'AUTRE': return 'Autre';
      default: return '';
    }
  }
}
