import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { FormsModule } from '@angular/forms';
import {
  LucideLayoutDashboard, LucideFileText,
  LucideSearch, LucideShield, LucideLogOut, LucideUser, LucideBuilding, LucideX, LucideCamera
} from '@lucide/angular';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule,
    LucideLayoutDashboard, LucideFileText,
    LucideSearch, LucideShield, LucideLogOut, LucideUser, LucideBuilding, LucideX, LucideCamera],
  template: `
    <aside class="sidebar-container">
      <div class="sidebar-header flex items-center gap-3">
        <div class="logo-circle">
          <img src="/logo.png" alt="Logo" class="logo-img">
        </div>
        <span>GED RH</span>
      </div>

      <div class="px-4 pt-3 pb-1">
        <span class="role-badge">
          {{ roleLabel }}
        </span>
      </div>

      <nav class="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <a [routerLink]="dashboardRoute" routerLinkActive="active-link"
           class="nav-link">
          <svg lucideLayoutDashboard class="w-4 h-4 shrink-0"></svg>
          Tableau de bord
        </a>

        <a routerLink="/employees" routerLinkActive="active-link"
           class="nav-link">
          <svg lucideUser class="w-4 h-4 shrink-0"></svg>
          Employés
        </a>

        <a routerLink="/documents" routerLinkActive="active-link"
           class="nav-link">
          <svg lucideFileText class="w-4 h-4 shrink-0"></svg>
          Documents
        </a>

        <div *ngIf="isAdmin" class="pt-4 pb-2 px-3">
          <p class="admin-section-title">Administration</p>
          <div class="space-y-1">
            <a routerLink="/admin/users" routerLinkActive="active-link"
               class="nav-link">
              <svg lucideShield class="w-4 h-4 shrink-0"></svg>
              Utilisateurs
            </a>
            <a routerLink="/admin/organization" routerLinkActive="active-link"
               class="nav-link">
              <svg lucideBuilding class="w-4 h-4 shrink-0"></svg>
              Departements
            </a>
          </div>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-divider"></div>
        <div class="user-info flex items-center gap-3">
          <button (click)="openProfile()" class="user-avatar-btn">
            <img *ngIf="profile?.photoUrl; else avatarIcon" [src]="apiUrl + profile?.photoUrl" alt="User" class="user-avatar-img">
            <ng-template #avatarIcon>
              <img src="/UserIcon.png" alt="User" class="user-avatar-img">
            </ng-template>
          </button>
          <div class="min-w-0">
            <p class="user-name truncate">{{ userName }}</p>
            <p class="user-matricule">{{ profile?.matricule || profile?.email }}</p>
          </div>
        </div>

        <div class="sidebar-divider"></div>

        <button (click)="logout()" class="logout-button">
          <svg lucideLogOut class="w-4 h-4 shrink-0"></svg>
          Déconnexion
        </button>
      </div>
    </aside>

    <!-- Profile Popup -->
    <div *ngIf="showProfile" class="profile-overlay" (click)="showProfile = false">
      <div class="profile-popup" (click)="$event.stopPropagation()">
        <div class="profile-popup-header">
          <h3>Mon Profil</h3>
          <button (click)="showProfile = false" class="close-btn"><svg lucideX class="w-5 h-5"></svg></button>
        </div>

        <div class="profile-popup-body">
          <!-- Photo -->
          <div class="profile-photo-section">
            <div class="profile-photo-wrapper">
              <img *ngIf="profile?.photoUrl; else popupAvatar" [src]="apiUrl + profile?.photoUrl" alt="Photo" class="profile-photo">
              <ng-template #popupAvatar>
                <img src="/UserIcon.png" alt="User" class="profile-photo">
              </ng-template>
              <button class="camera-btn" (click)="photoInput.click()">
                <svg lucideCamera class="w-4 h-4"></svg>
              </button>
            </div>
            <input #photoInput type="file" accept="image/*" (change)="onPhotoSelected($event)" hidden>
            <p *ngIf="photoUploading" class="text-xs text-blue-600 mt-2">Upload en cours...</p>
            <p *ngIf="photoError" class="text-xs text-red-500 mt-2">{{ photoError }}</p>
          </div>

          <!-- Form -->
          <div class="profile-form">
            <div class="form-group">
              <label>Prénom</label>
              <input [(ngModel)]="editFirstName" type="text" class="form-input">
            </div>
            <div class="form-group">
              <label>Nom</label>
              <input [(ngModel)]="editLastName" type="text" class="form-input">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input [(ngModel)]="editEmail" type="email" class="form-input">
            </div>
            <div class="form-group">
              <label>Matricule</label>
              <input [value]="profile?.matricule || '—'" type="text" class="form-input bg-gray-50" readonly disabled>
            </div>
            <p *ngIf="saveError" class="text-xs text-red-500">{{ saveError }}</p>
            <p *ngIf="saveSuccess" class="text-xs text-green-600">Profil mis à jour avec succès</p>
          </div>
        </div>

        <div class="profile-popup-footer">
          <button (click)="showProfile = false" class="cancel-btn">Annuler</button>
          <button (click)="saveProfile()" [disabled]="saving" class="save-btn">
            {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .sidebar-container {
      width: 16rem;
      background-color: #00072D;
      color: rgba(255, 255, 255, 0.95);
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .sidebar-header {
      padding: 1.5rem;
      font-size: 1.25rem;
      font-weight: bold;
      border-bottom: 1px solid #203060;
      letter-spacing: 0.025em;
    }

    .logo-circle {
      width: 48px;
      height: 48px;
      background-color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .logo-img {
      width: 40px;
      height: 40px;
      object-fit: contain;
    }

    .role-badge {
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      background-color: #152040;
      color: rgba(255, 255, 255, 0.8);
      font-weight: 500;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem;
      border-radius: 0.5rem;
      transition: background-color 0.2s;
      font-size: 0.875rem;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.95);
      text-decoration: none;
    }
    .nav-link:hover {
      background-color: #152040;
    }
    .active-link {
      background-color: #152040;
    }

    .admin-section-title {
      font-size: 0.625rem;
      font-weight: bold;
      color: rgba(255, 255, 255, 0.6);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }

    .sidebar-footer {
      padding: 1rem;
      background-color: rgba(0, 7, 45, 0.5);
    }
    .user-info {
      padding: 0 0.5rem 1rem 0.5rem;
    }
    .user-avatar-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.3);
      overflow: hidden;
      cursor: pointer;
      flex-shrink: 0;
      background: white;
      padding: 0;
      transition: border-color 0.2s;
    }
    .user-avatar-btn:hover {
      border-color: rgba(255, 255, 255, 0.8);
    }
    .user-avatar-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 2px;
    }
    .user-name {
      font-weight: bold;
      font-size: 1rem;
      margin-bottom: 0.125rem;
      color: rgba(255, 255, 255, 0.95);
    }
    .user-matricule {
      font-size: 0.6875rem;
      color: rgba(255, 255, 255, 0.55);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sidebar-divider {
      height: 1px;
      background-color: #203060;
      margin: 0 0.5rem 1rem 0.5rem;
    }
    .logout-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.5rem 0.75rem;
      border-radius: 0.5rem;
      background: transparent;
      border: none;
      color: #f87171;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s;
      cursor: pointer;
    }
    .logout-button:hover {
      background-color: rgba(185, 28, 28, 0.2);
      color: #fca5a5;
    }

    /* Profile Popup */
    .profile-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .profile-popup {
      background: white;
      border-radius: 1rem;
      width: 100%;
      max-width: 420px;
      margin: 1rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    .profile-popup-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }
    .profile-popup-header h3 {
      font-size: 1.125rem;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }
    .close-btn {
      background: none;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 0.375rem;
    }
    .close-btn:hover { color: #374151; }
    .profile-popup-body {
      padding: 1.5rem;
    }
    .profile-photo-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .profile-photo-wrapper {
      position: relative;
      width: 80px;
      height: 80px;
    }
    .profile-photo {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid #e5e7eb;
    }
    .camera-btn {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #3b82f6;
      border: 2px solid white;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .camera-btn:hover { background: #2563eb; }
    .profile-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .form-group label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .form-input {
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      color: #111827;
      outline: none;
      transition: border-color 0.2s;
    }
    .form-input:focus {
      border-color: #3b82f6;
      ring: 2px solid #3b82f6;
    }
    .profile-popup-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
    }
    .cancel-btn {
      padding: 0.5rem 1rem;
      border: 1px solid #d1d5db;
      border-radius: 0.5rem;
      background: white;
      color: #374151;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
    }
    .cancel-btn:hover { background: #f3f4f6; }
    .save-btn {
      padding: 0.5rem 1.25rem;
      border: none;
      border-radius: 0.5rem;
      background: #3b82f6;
      color: white;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
    }
    .save-btn:hover { background: #2563eb; }
    .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class Sidebar implements OnInit {
  @Input() userEmail = '';
  apiUrl = environment.apiUrl;

  isAdmin = false;
  isRH = false;
  isManager = false;
  isDG = false;
  dashboardRoute = '/dashboard';
  roleLabel = '';
  userName = '';
  profile: any = null;

  showProfile = false;
  editFirstName = '';
  editLastName = '';
  editEmail = '';
  saving = false;
  saveError = '';
  saveSuccess = false;
  photoUploading = false;
  photoError = '';

  constructor(private authService: AuthService) {}

  ngOnInit() {
    const update = () => {
      const p = this.authService.profile();
      if (p) {
        this.profile = p;
        this.isAdmin = p.roles.includes('ADMINISTRATOR');
        this.isRH = p.roles.includes('RH');
        this.isManager = p.roles.includes('MANAGER');
        this.isDG = p.roles.includes('DIRECTION_GENERALE');
        this.dashboardRoute = this.authService.getDashboardRoute(p.roles);
        this.roleLabel = this.getRoleLabel(p.roles);
        this.userEmail = p.email;
        this.userName = `${p.firstName} ${p.lastName}`;
      }
    };
    update();
    const interval = setInterval(() => {
      update();
      if (this.authService.profile()) clearInterval(interval);
    }, 500);
  }

  private getRoleLabel(roles: string[]): string {
    if (roles.includes('ADMINISTRATOR')) return 'Administrateur';
    if (roles.includes('DIRECTION_GENERALE')) return 'Direction Générale';
    if (roles.includes('MANAGER')) return 'Manager';
    if (roles.includes('RH')) return 'Ressources Humaines';
    return '';
  }

  logout() {
    this.authService.signOut();
  }

  openProfile() {
    const p = this.authService.profile();
    if (p) {
      this.editFirstName = p.firstName;
      this.editLastName = p.lastName;
      this.editEmail = p.email;
      this.saveError = '';
      this.saveSuccess = false;
      this.showProfile = true;
    }
  }

  async saveProfile() {
    this.saving = true;
    this.saveError = '';
    this.saveSuccess = false;
    try {
      await this.authService.updateProfile({
        firstName: this.editFirstName,
        lastName: this.editLastName,
        email: this.editEmail
      });
      this.saveSuccess = true;
      // Update local state
      const p = this.authService.profile();
      if (p) {
        this.userName = `${p.firstName} ${p.lastName}`;
        this.userEmail = p.email;
      }
      setTimeout(() => { this.saveSuccess = false; }, 3000);
    } catch (e: any) {
      this.saveError = e?.error?.message || e?.message || 'Erreur lors de la mise à jour';
    } finally {
      this.saving = false;
    }
  }

  async onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    this.photoUploading = true;
    this.photoError = '';
    try {
      await this.authService.uploadPhoto(file);
    } catch (e: any) {
      this.photoError = 'Erreur lors de l\'upload de la photo';
    } finally {
      this.photoUploading = false;
    }
  }
}
