import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { LucideCheck, LucideX, LucideClock, LucideRefreshCw } from '@lucide/angular';
import { getErrorMessage } from '../../../core/utils/error.utils';

@Component({
  selector: 'app-admin-reclamations',
  standalone: true,
  imports: [CommonModule, LucideCheck, LucideX, LucideClock, LucideRefreshCw],
  template: `
    <div class="reclamations-container">
      <div class="header">
        <h2>Réclamations</h2>
        <button (click)="load()" class="refresh-btn" [disabled]="loading()">
          <svg lucideRefreshCw class="w-4 h-4" [class.spin]="loading()"></svg>
          Actualiser
        </button>
      </div>

      <!-- Gradient divider -->
      <div class="mb-6 h-px bg-gradient-to-r from-blue-400 via-purple-400 to-transparent"></div>

      <div *ngIf="loading()" class="text-center py-8 text-gray-500">Chargement...</div>

      <div *ngIf="!loading() && reclamations().length === 0" class="empty-state">
        Aucune réclamation en attente
      </div>

      <div *ngIf="reclamations().length > 0" class="table-wrapper">
        <table class="reclamations-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Employé</th>
              <th>Email actuel</th>
              <th>Nouvel email</th>
              <th>Statut</th>
              <th>Traité par</th>
              <th *ngIf="hasPending()">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of reclamations()">
              <td class="text-sm">{{ formatDate(r.createdAt) }}</td>
              <td>
                <div class="font-medium">{{ r.employeeFirstName }} {{ r.employeeLastName }}</div>
              </td>
              <td class="text-sm text-gray-600">{{ r.employeeEmail }}</td>
              <td class="text-sm font-medium text-blue-700">{{ r.newValue }}</td>
              <td>
                <span [class]="'status-badge ' + statusClass(r.status)">
                  {{ statusLabel(r.status) }}
                </span>
              </td>
              <td class="text-sm text-gray-600">{{ r.processedByName || '—' }}</td>
              <td *ngIf="r.status === 'PENDING'">
                <div class="actions">
                  <button (click)="approve(r.id)" class="btn-approve" title="Approuver">
                    <svg lucideCheck class="w-4 h-4"></svg>
                  </button>
                  <button (click)="reject(r.id)" class="btn-reject" title="Rejeter">
                    <svg lucideX class="w-4 h-4"></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="error" class="error-msg">{{ error }}</div>
    </div>
  `,
  styles: [`
    .reclamations-container {
      padding: 2rem;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }
    .header h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }
    .refresh-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border: 1px solid #d1d5db;
      border-radius: 0.5rem;
      background: white;
      color: #374151;
      font-size: 0.875rem;
      cursor: pointer;
    }
    .refresh-btn:hover { background: #f9fafb; }
    .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #9ca3af;
      font-size: 0.875rem;
    }

    .table-wrapper {
      overflow-x: auto;
    }
    .reclamations-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 0.75rem;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .reclamations-table th {
      text-align: left;
      padding: 0.75rem 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }
    .reclamations-table td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #f3f4f6;
    }
    .reclamations-table tr:last-child td { border-bottom: none; }
    .reclamations-table tr:hover td { background: #f9fafb; }

    .status-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-approved { background: #d1fae5; color: #065f46; }
    .status-rejected { background: #fee2e2; color: #991b1b; }

    .actions {
      display: flex;
      gap: 0.5rem;
    }
    .btn-approve, .btn-reject {
      padding: 0.375rem;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
    }
    .btn-approve { background: #d1fae5; color: #065f46; }
    .btn-approve:hover { background: #a7f3d0; }
    .btn-reject { background: #fee2e2; color: #991b1b; }
    .btn-reject:hover { background: #fecaca; }

    .error-msg {
      margin-top: 1rem;
      padding: 0.75rem;
      background: #fee2e2;
      color: #991b1b;
      border-radius: 0.5rem;
      font-size: 0.875rem;
    }
  `]
})
export class AdminReclamations implements OnInit {
  reclamations = signal<any[]>([]);
  loading = signal(true);
  error = '';

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.load();
  }

  async load() {
    this.loading.set(true);
    this.error = '';
    try {
      this.reclamations.set(await this.authService.getReclamations());
    } catch (e: any) {
      this.error = getErrorMessage(e, 'Erreur lors du chargement');
    } finally {
      this.loading.set(false);
    }
  }

  hasPending(): boolean {
    return this.reclamations().some(r => r.status === 'PENDING');
  }

  async approve(id: string) {
    try {
      await this.authService.approveReclamation(id);
      await this.load();
    } catch (e: any) {
      this.error = getErrorMessage(e, 'Erreur');
    }
  }

  async reject(id: string) {
    try {
      await this.authService.rejectReclamation(id);
      await this.load();
    } catch (e: any) {
      this.error = getErrorMessage(e, 'Erreur');
    }
  }

  statusClass(s: string): string {
    return 'status-' + s.toLowerCase();
  }

  statusLabel(s: string): string {
    switch (s) {
      case 'PENDING': return 'En attente';
      case 'APPROVED': return 'Approuvé';
      case 'REJECTED': return 'Rejeté';
      default: return s;
    }
  }

  formatDate(d: string): string {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}
