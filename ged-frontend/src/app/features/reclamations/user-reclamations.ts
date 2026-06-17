import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { LucideSend, LucideCheck, LucideX, LucideRefreshCw } from '@lucide/angular';

@Component({
  selector: 'app-user-reclamations',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideSend, LucideCheck, LucideX, LucideRefreshCw],
  template: `
    <div class="page">
      <h2>Réclamations</h2>

      <!-- Submit form -->
      <div class="card">
        <h3>Nouvelle réclamation</h3>
        <p class="desc">Envoyez une réclamation à l'administrateur et à votre manager.</p>
        <div class="form-group">
          <label>Titre</label>
          <input [(ngModel)]="title" type="text" placeholder="Titre de la réclamation" class="form-input">
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea [(ngModel)]="message" rows="5" placeholder="Décrivez votre réclamation en détail..." class="form-input"></textarea>
        </div>
        <button (click)="submit()" [disabled]="!title || !message || submitting" class="btn-submit">
          <svg lucideSend class="w-4 h-4"></svg>
          {{ submitting ? 'Envoi...' : 'Envoyer' }}
        </button>
        <p *ngIf="submitSuccess" class="text-green-600 text-sm mt-2">Réclamation envoyée avec succès</p>
        <p *ngIf="submitError" class="text-red-500 text-sm mt-2">{{ submitError }}</p>
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
              <th>Manager</th>
              <th>Titre</th>
              <th>Statut</th>
              <th>Traité par</th>
              <th *ngIf="hasPending()">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of allReclamations()">
              <td class="text-sm">{{ formatDate(r.createdAt) }}</td>
              <td class="font-medium">{{ r.employeeFirstName }} {{ r.employeeLastName }}</td>
              <td class="text-sm text-gray-600">{{ r.employeeManagerName || '—' }}</td>
              <td class="text-sm max-w-xs truncate" [title]="r.title">{{ r.title }}</td>
              <td><span [class]="'badge ' + statusClass(r.status)">{{ statusLabel(r.status) }}</span></td>
              <td class="text-sm text-gray-600">{{ r.processedByName || '—' }}</td>
              <td *ngIf="r.status === 'PENDING'">
                <div class="action-btns">
                  <button (click)="approve(r.id)" class="btn-approve" title="Approuver"><svg lucideCheck class="w-4 h-4"></svg></button>
                  <button (click)="reject(r.id)" class="btn-reject" title="Rejeter"><svg lucideX class="w-4 h-4"></svg></button>
                </div>
              </td>
            </tr>
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
              <th>Titre</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of teamReclamations()">
              <td class="text-sm">{{ formatDate(r.createdAt) }}</td>
              <td class="font-medium">{{ r.employeeFirstName }} {{ r.employeeLastName }}</td>
              <td class="text-sm">{{ r.title }}</td>
              <td><span [class]="'badge ' + statusClass(r.status)">{{ statusLabel(r.status) }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- My reclamations -->
      <div class="card">
        <h3>Mes réclamations</h3>
        <div *ngIf="myReclamations().length === 0" class="text-gray-400 text-sm py-4 text-center">Aucune réclamation</div>
        <table *ngIf="myReclamations().length > 0" class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Titre</th>
              <th>Statut</th>
              <th>Traité par</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of myReclamations()">
              <td class="text-sm">{{ formatDate(r.createdAt) }}</td>
              <td class="text-sm">{{ r.title }}</td>
              <td><span [class]="'badge ' + statusClass(r.status)">{{ statusLabel(r.status) }}</span></td>
              <td class="text-sm text-gray-600">{{ r.processedByName || '—' }}</td>
            </tr>
          </tbody>
        </table>
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

    .action-btns { display: flex; gap: 0.375rem; }
    .btn-approve, .btn-reject { padding: 0.25rem 0.5rem; border: none; border-radius: 0.25rem; cursor: pointer; }
    .btn-approve { background: #d1fae5; color: #065f46; }
    .btn-approve:hover { background: #a7f3d0; }
    .btn-reject { background: #fee2e2; color: #991b1b; }
    .btn-reject:hover { background: #fecaca; }
  `]
})
export class UserReclamations implements OnInit {
  title = '';
  message = '';
  submitting = false;
  submitSuccess = false;
  submitError = '';

  isAdmin = false;
  isManager = false;
  allReclamations = signal<any[]>([]);
  loadingAll = signal(false);
  adminError = '';

  teamReclamations = signal<any[]>([]);
  loadingTeam = signal(false);
  teamError = '';

  myReclamations = signal<any[]>([]);

  constructor(private authService: AuthService) {}

  async ngOnInit() {
    const p = this.authService.profile();
    this.isAdmin = p?.roles?.includes('ADMINISTRATOR') ?? false;
    this.isManager = p?.roles?.includes('MANAGER') ?? false;
    if (this.isAdmin) {
      this.loadAll();
    } else if (this.isManager) {
      this.loadTeam();
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
      await this.authService.createReclamation(this.title, this.message);
      this.submitSuccess = true;
      this.title = '';
      this.message = '';
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

  hasPending() { return this.allReclamations().some(r => r.status === 'PENDING'); }

  async approve(id: string) {
    await this.authService.approveReclamation(id);
    await this.loadAll();
  }

  async reject(id: string) {
    await this.authService.rejectReclamation(id);
    await this.loadAll();
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
  formatDate(d: string) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }
}
