import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { UserService } from '../../../core/services/user.service';
import { OrganizationService } from '../../../core/services/organization.service';
import { DocumentService } from '../../../core/services/document.service';
import { environment } from '../../../../environments/environment';
import { FormsModule } from '@angular/forms';
import {
  LucideLayoutDashboard,
  LucideLogOut, LucideX, LucideCamera,
  LucideEye, LucideEyeOff, LucideCheck, LucideMegaphone, LucideGitBranch,
  LucideUsers, LucideFiles, LucideMessageSquareWarning, LucideBuilding2,
  LucideFileType, LucideUserCog, LucideCalendarDays
} from '@lucide/angular';
import { getErrorMessage } from '../../../core/utils/error.utils';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule,
    LucideLayoutDashboard,
    LucideLogOut, LucideX, LucideCamera,
    LucideEye, LucideEyeOff, LucideCheck, LucideMegaphone, LucideGitBranch,
    LucideUsers, LucideFiles, LucideMessageSquareWarning, LucideBuilding2,
    LucideFileType, LucideUserCog, LucideCalendarDays],
  template: `
    <aside class="sidebar-container">
      <div class="sidebar-header flex items-center gap-3">
        <img src="/logo.png" alt="Logo" class="logo-img">
        <div class="min-w-0 flex-1">
          <span class="block leading-tight truncate">GED RH</span>
          <span class="sidebar-sub">Gestion Électronique des Documents</span>
        </div>
        <button (click)="sidebarClose.emit()" aria-label="Fermer le menu" class="lg:hidden w-[34px] h-[34px] rounded-[9px] bg-white/10 text-white/80 hover:bg-white/20 transition-colors flex items-center justify-center shrink-0">
          <svg lucideX class="w-4.5 h-4.5"></svg>
        </button>
      </div>

      <div class="px-4 pt-3 pb-1">
        <span class="role-banner">Espace {{ roleLabel }}</span>
      </div>

      <nav class="flex-1 px-3 py-3 space-y-1 overflow-y-auto" (click)="sidebarClose.emit()">
        <a [routerLink]="dashboardRoute" routerLinkActive="active-link"
           class="nav-link">
          <svg lucideLayoutDashboard class="w-4 h-4 shrink-0"></svg>
          Tableau de bord
        </a>

        <a [routerLink]="employeesRoute" routerLinkActive="active-link"
           class="nav-link">
          <svg lucideUsers class="w-4 h-4 shrink-0"></svg>
          {{ isManager ? 'Mon équipe' : 'Employés' }}
          <span *ngIf="employeeCount > 0" class="nav-badge">{{ employeeCount }}</span>
        </a>

        <a [routerLink]="documentsRoute" routerLinkActive="active-link"
           class="nav-link">
          <svg lucideFiles class="w-4 h-4 shrink-0"></svg>
          {{ isManager ? 'Documents ' : 'Documents' }}
          <span *ngIf="documentCount > 0" class="nav-badge">{{ documentCount }}</span>
        </a>

        <a *ngIf="isAdmin || isRH || isManager" routerLink="/calendar" routerLinkActive="active-link"
           class="nav-link">
          <svg lucideCalendarDays class="w-4 h-4 shrink-0"></svg>
          Calendrier
        </a>

        <a *ngIf="!isDG" routerLink="/reclamations" routerLinkActive="active-link"
           class="nav-link" style="position: relative;">
          <svg lucideMessageSquareWarning class="w-4 h-4 shrink-0"></svg>
          Réclamations
          <span *ngIf="recBadgeCount > 0" class="rec-badge">{{ recBadgeCount }}</span>
        </a>

        <a *ngIf="isManager && !isDG" routerLink="/dashboard/manager/organigramme" routerLinkActive="active-link"
           class="nav-link">
          <svg lucideGitBranch class="w-4 h-4 shrink-0"></svg>
          Mon organigramme
        </a>

        <div *ngIf="isDG" class="pt-4 pb-2 px-3">
          <p class="admin-section-title">Organisation</p>
          <div class="space-y-1">
            <a routerLink="/admin/organization" routerLinkActive="active-link"
               class="nav-link">
              <svg lucideBuilding2 class="w-4 h-4 shrink-0"></svg>
              Départements
              <span *ngIf="departmentCount > 0" class="nav-badge">{{ departmentCount }}</span>
            </a>
            <a routerLink="/admin/announcements" routerLinkActive="active-link"
               class="nav-link">
              <svg lucideMegaphone class="w-4 h-4 shrink-0"></svg>
              Annonces
            </a>
            <a routerLink="/admin/organigramme" routerLinkActive="active-link"
               class="nav-link">
              <svg lucideGitBranch class="w-4 h-4 shrink-0"></svg>
              Organigramme
            </a>
          </div>
        </div>

        <div *ngIf="isAdmin" class="pt-4 pb-2 px-3">
          <p class="admin-section-title">Administration</p>
          <div class="space-y-1">
            <a routerLink="/admin/users" routerLinkActive="active-link"
               class="nav-link">
              <svg lucideUserCog class="w-4 h-4 shrink-0"></svg>
              Utilisateurs
              <span *ngIf="userCount > 0" class="nav-badge">{{ userCount }}</span>
            </a>
            <a routerLink="/admin/organization" routerLinkActive="active-link"
               class="nav-link">
              <svg lucideBuilding2 class="w-4 h-4 shrink-0"></svg>
              Départements
              <span *ngIf="departmentCount > 0" class="nav-badge">{{ departmentCount }}</span>
            </a>
            <a routerLink="/admin/doc-types" routerLinkActive="active-link"
               class="nav-link">
              <svg lucideFileType class="w-4 h-4 shrink-0"></svg>
              Types de documents
            </a>
            <a routerLink="/admin/announcements" routerLinkActive="active-link"
               class="nav-link">
              <svg lucideMegaphone class="w-4 h-4 shrink-0"></svg>
              Annonces
            </a>
            <a routerLink="/admin/organigramme" routerLinkActive="active-link"
               class="nav-link">
              <svg lucideGitBranch class="w-4 h-4 shrink-0"></svg>
              Organigramme
            </a>
          </div>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-divider"></div>
        <div class="role-footer">{{ roleLabel }}</div>
        <div class="user-info flex items-center gap-3">
          <button (click)="openProfile()" class="user-avatar-btn">
            <img *ngIf="profile?.photoUrl; else avatarIcon" [src]="apiUrl + profile?.photoUrl" alt="User" class="user-avatar-img">
            <ng-template #avatarIcon>
              <img src="/UserIcon.png" alt="User" class="user-avatar-img">
            </ng-template>
          </button>
          <div class="min-w-0">
            <p class="user-name truncate">{{ userName }}</p>
            <p class="user-email truncate">{{ profile?.email }}</p>
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
          <div class="min-w-0">
            <div class="pp-label">Compte</div>
            <h3 class="pp-title">Mon Profil</h3>
          </div>
          <button (click)="showProfile = false" class="close-btn" aria-label="Fermer">
            <svg lucideX class="w-4.5 h-4.5 text-[#68758a]"></svg>
          </button>
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
            <p *ngIf="photoUploading" class="pp-status-center text-blue-600 mt-2">Upload en cours...</p>
            <p *ngIf="photoError" class="pp-status-center text-red-500 mt-2">{{ photoError }}</p>
          </div>

          <!-- Info -->
          <div class="pp-info-card">
            <div class="pp-info-row">
              <span class="pp-info-label">Email</span>
              <span class="pp-info-value">{{ profile?.email }}</span>
            </div>
            <div class="pp-info-row">
              <span class="pp-info-label">Matricule</span>
              <span class="pp-info-value">{{ profile?.matricule || '—' }}</span>
            </div>
            <div class="pp-info-row pp-info-row-last">
              <span class="pp-info-label">Rôle</span>
              <span class="pp-info-value">{{ roleLabel }}</span>
            </div>
          </div>

          <!-- Email change request -->
          <div class="pp-section">
            <div class="pp-section-head">
              <p class="pp-section-title">Changer d'email</p>
              <p class="pp-section-desc">Saisissez le nouvel email souhaité. Une demande sera envoyée à l'administrateur.</p>
            </div>
            <input [(ngModel)]="newEmail" type="email" placeholder="Nouvel email" class="pp-input">
            <button (click)="sendEmailChangeRequest()" [disabled]="!newEmail || sendingRequest" class="pp-btn pp-btn-primary">
              {{ sendingRequest ? 'Envoi...' : 'Envoyer la demande' }}
            </button>
            <p *ngIf="requestSuccess" class="pp-status-left text-green-600 mt-2">Demande envoyée avec succès</p>
            <p *ngIf="requestError" class="pp-status-left text-red-500 mt-2">{{ requestError }}</p>
          </div>

          <!-- Password change -->
          <div class="pp-section">
            <div class="pp-section-head">
              <p class="pp-section-title">Changer le mot de passe</p>
            </div>
            <div class="relative">
              <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="currentPassword" placeholder="Mot de passe actuel" class="pp-input pr-12">
              <button type="button" (click)="showPassword = !showPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa5b7] hover:text-[#4a5568]">
                <svg *ngIf="!showPassword" lucideEye class="w-4 h-4"></svg>
                <svg *ngIf="showPassword" lucideEyeOff class="w-4 h-4"></svg>
              </button>
            </div>
            <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="newPassword" placeholder="Nouveau mot de passe" class="pp-input mt-2">
            <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="confirmPassword" placeholder="Confirmer le mot de passe" class="pp-input mt-2">
            <button (click)="changePassword()" [disabled]="isPasswordChangeDisabled()" class="pp-btn pp-btn-primary">
              {{ passwordChanging ? 'Mise à jour...' : 'Changer le mot de passe' }}
            </button>
            <p *ngIf="passwordSuccess" class="pp-status-left text-green-600 mt-2">Mot de passe mis à jour avec succès</p>
            <p *ngIf="passwordError" class="pp-status-left text-red-500 mt-2">{{ passwordError }}</p>
          </div>
        </div>

        <div class="profile-popup-footer">
          <button (click)="showProfile = false" class="pp-btn pp-btn-cancel">Fermer</button>
        </div>
      </div>
    </div>

    <!-- Reclamation Confirmation Popup -->
    <div *ngIf="pendingRec" class="reclamation-overlay">
      <div class="reclamation-popup" (click)="$event.stopPropagation()">
        <div class="reclamation-popup-header">
          <h3 *ngIf="pendingRec.status === 'APPROVED' && pendingRec.newValue">Demande approuvée</h3>
          <h3 *ngIf="pendingRec.status === 'APPROVED' && !pendingRec.newValue">Demande approuvée</h3>
          <h3 *ngIf="pendingRec.status === 'REJECTED'">Demande refusée</h3>
          <div class="status-icon" [class.bg-green-100]="pendingRec.status === 'APPROVED'" [class.bg-red-100]="pendingRec.status === 'REJECTED'">
            <svg *ngIf="pendingRec.status === 'APPROVED'" lucideCheck class="w-5 h-5 text-green-600"></svg>
            <svg *ngIf="pendingRec.status === 'REJECTED'" lucideX class="w-5 h-5 text-red-600"></svg>
          </div>
        </div>
        <div class="reclamation-popup-body">
          <div *ngIf="pendingRec.status === 'APPROVED' && pendingRec.newValue" class="text-center">
            <p class="rec-message">Votre demande de changement d'email a été <strong>approuvée</strong>.</p>
            <p class="rec-new-email">Nouvel email : <span class="email-highlight">{{ pendingRec.newValue }}</span></p>
            <p class="rec-logout-notice">Vous allez être déconnecté. Veuillez vous reconnecter avec vos nouveaux identifiants.</p>
          </div>
          <div *ngIf="pendingRec.status === 'APPROVED' && !pendingRec.newValue" class="text-center">
            <p class="rec-message">Votre demande "{{ pendingRec.title }}" a été <strong>approuvée</strong>.</p>
          </div>
          <div *ngIf="pendingRec.status === 'REJECTED'" class="text-center">
            <p class="rec-message">Votre demande "{{ pendingRec.title }}" a été <strong>refusée</strong>.</p>
            <p *ngIf="rejectionLabel(pendingRec.rejectionReason)" class="rec-reject-reason">
              Motif : {{ rejectionLabel(pendingRec.rejectionReason) }}
              <span *ngIf="pendingRec.rejectionComment"> — {{ pendingRec.rejectionComment }}</span>
            </p>
          </div>
        </div>
        <div class="reclamation-popup-footer">
          <button (click)="confirmReclamation()" class="rec-confirm-btn">
            {{ pendingRec.status === 'APPROVED' && pendingRec.newValue ? 'Appliquer et se déconnecter' : 'OK' }}
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

    /* Custom scrollbar for dark sidebar */
    :host ::-webkit-scrollbar {
      width: 5px;
    }
    :host ::-webkit-scrollbar-track {
      background: transparent;
    }
    :host ::-webkit-scrollbar-thumb {
      background: #203060;
      border-radius: 9999px;
    }
    :host ::-webkit-scrollbar-thumb:hover {
      background: #304878;
    }
    /* Firefox */
    :host {
      scrollbar-width: thin;
      scrollbar-color: #203060 transparent;
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

    .sidebar-sub {
      display: block;
      font-size: 0.68rem;
      font-weight: 500;
      line-height: 1.3;
      color: #8ea0c4;
      letter-spacing: 0.02em;
      margin-top: 3px;
    }

    .logo-img {
      width: 56px;
      height: 56px;
      object-fit: contain;
    }

    .role-banner {
      display: block;
      font-size: 0.75rem;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      background-color: #152040;
      color: rgba(255, 255, 255, 0.9);
      font-weight: 600;
      text-align: center;
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

    .nav-badge {
      margin-left: auto;
      font-size: 9px;
      font-weight: 700;
      padding: 3px 7px;
      border-radius: 20px;
      background-color: rgba(255, 255, 255, 0.09);
      color: rgba(255, 255, 255, 0.85);
      line-height: 1;
      flex: none;
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
    .user-email {
      font-size: 0.6875rem;
      color: rgba(255, 255, 255, 0.55);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .role-footer {
      font-size: 0.8125rem;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.85);
      padding: 0 0.5rem 0.5rem 0.5rem;
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
      background: rgba(21, 33, 61, 0.5);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }
    .profile-popup {
      background: white;
      border-radius: 18px;
      width: 100%;
      max-width: 440px;
      box-shadow: 0 24px 60px rgba(21, 33, 61, 0.28);
      overflow: hidden;
      font-family: Inter, system-ui, Arial, sans-serif;
    }
    .profile-popup-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.5rem 1.5rem 1rem 1.5rem;
      border-bottom: 1px solid #f2f4f7;
    }
    .pp-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #9aa5b7;
      margin-bottom: 0.25rem;
    }
    .pp-title {
      font-size: 18px;
      font-weight: 700;
      color: #15213d;
      margin: 0;
      letter-spacing: -0.25px;
      line-height: 1.3;
    }
    .close-btn {
      width: 34px;
      height: 34px;
      border-radius: 9px;
      border: none;
      background: transparent;
      color: #68758a;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background-color 0.15s;
    }
    .close-btn:hover { background: #f6f8fb; }
    .profile-popup-body {
      padding: 1.5rem;
      overflow-y: auto;
      max-height: 62vh;
    }
    .profile-photo-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .profile-photo-wrapper {
      position: relative;
      width: 84px;
      height: 84px;
    }
    .profile-photo {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid #fff;
      box-shadow: 0 0 0 1px #eef1f6, 0 8px 20px rgba(21, 33, 61, 0.10);
    }
    .camera-btn {
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: #2563eb;
      border: 3px solid white;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 10px rgba(37, 99, 235, 0.35);
      transition: background-color 0.15s;
    }
    .camera-btn:hover { background: #1d4ed8; }

    .pp-status-center { font-size: 12px; text-align: center; }
    .pp-status-left { font-size: 12px; }

    .pp-info-card {
      background: #f8fafc;
      border: 1px solid #eef1f6;
      border-radius: 13px;
      padding: 0 1.25rem;
      margin-bottom: 1.25rem;
    }
    .pp-info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid #eef1f6;
    }
    .pp-info-row-last { border-bottom: none; }
    .pp-info-label {
      font-size: 11px;
      font-weight: 600;
      color: #9aa5b7;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      flex-shrink: 0;
    }
    .pp-info-value {
      font-size: 13px;
      font-weight: 600;
      color: #15213d;
      text-align: right;
      word-break: break-word;
    }

    .pp-section {
      padding-top: 1.25rem;
      margin-top: 1.25rem;
      border-top: 1px solid #eef1f6;
    }
    .pp-section-head { margin-bottom: 0.75rem; }
    .pp-section-title {
      font-size: 14px;
      font-weight: 700;
      color: #15213d;
      margin: 0 0 0.25rem 0;
    }
    .pp-section-desc {
      font-size: 12px;
      color: #8793a6;
      margin: 0;
      line-height: 1.5;
    }
    .pp-input {
      width: 100%;
      padding: 0.6rem 0.85rem;
      border: 1px solid #e1e7ef;
      border-radius: 10px;
      font-size: 13px;
      color: #15213d;
      outline: none;
      background: #fff;
      transition: border-color 0.15s, box-shadow 0.15s;
      box-sizing: border-box;
    }
    .pp-input:focus {
      border-color: #93c5fd;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }
    .pp-input::placeholder { color: #9aa5b7; }
    .pp-btn {
      width: 100%;
      padding: 0.6rem 1rem;
      border: none;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.15s, opacity 0.15s;
      margin-top: 0.65rem;
    }
    .pp-btn-primary {
      background: #2563eb;
      color: white;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
    }
    .pp-btn-primary:hover { background: #1d4ed8; }
    .pp-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .pp-btn-cancel {
      background: #fff;
      color: #374151;
      border: 1px solid #e1e7ef;
      box-shadow: none;
    }
    .pp-btn-cancel:hover { background: #f7f9fc; }
    .profile-popup-footer {
      display: flex;
      justify-content: flex-end;
      padding: 1rem 1.5rem;
      border-top: 1px solid #eef1f6;
      background: #f9fafb;
    }
    .profile-popup-footer .pp-btn {
      width: auto;
      min-width: 96px;
      margin-top: 0;
    }

    /* Reclamation popup */
    .reclamation-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1100;
    }
    .reclamation-popup {
      background: white;
      border-radius: 1rem;
      width: 100%;
      max-width: 440px;
      margin: 1rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    .reclamation-popup-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }
    .reclamation-popup-header h3 {
      font-size: 1.125rem;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }
    .status-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .reclamation-popup-body {
      padding: 1.5rem;
    }
    .rec-message {
      font-size: 0.9375rem;
      color: #374151;
      margin: 0 0 0.75rem 0;
      line-height: 1.5;
    }
    .rec-new-email {
      font-size: 0.8125rem;
      color: #6b7280;
      margin: 0 0 0.75rem 0;
    }
    .email-highlight {
      font-weight: 700;
      color: #1d4ed8;
      background: #eff6ff;
      padding: 0.125rem 0.5rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
    }
    .rec-logout-notice {
      font-size: 0.75rem;
      color: #dc2626;
      margin: 0;
      font-weight: 500;
    }
    .reclamation-popup-footer {
      display: flex;
      justify-content: center;
      padding: 1rem 1.5rem;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
    }
    .rec-confirm-btn {
      padding: 0.625rem 1.5rem;
      border: none;
      border-radius: 0.5rem;
      background: #2563eb;
      color: white;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .rec-confirm-btn:hover { background: #1d4ed8; }

    .rec-reject-reason {
      margin-top: 0.5rem;
      font-size: 0.8125rem;
      color: #dc2626;
      background: #fef2f2;
      padding: 0.5rem 0.75rem;
      border-radius: 0.5rem;
      line-height: 1.4;
    }

    .rec-badge {
      position: absolute;
      right: 0.5rem;
      top: 50%;
      transform: translateY(-50%);
      background: #ef4444;
      color: white;
      font-size: 0.6875rem;
      font-weight: 700;
      min-width: 1.25rem;
      height: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 9999px;
      padding: 0 0.25rem;
      line-height: 1;
    }
  `]
})
export class Sidebar implements OnInit, OnDestroy {
  @Input() userEmail = '';
  @Output() sidebarClose = new EventEmitter<void>();
  apiUrl = environment.apiUrl;

  isAdmin = false;
  isRH = false;
  isManager = false;
  isDG = false;
  dashboardRoute = '/dashboard';
  employeesRoute = '/employees';
  documentsRoute = '/documents';
  roleLabel = '';
  userName = '';
  profile: any = null;

  showProfile = false;
  newEmail = '';
  sendingRequest = false;
  requestError = '';
  requestSuccess = false;
  photoUploading = false;
  photoError = '';
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  passwordChanging = false;
  passwordError = '';
  passwordSuccess = false;
  showPassword = false;
  pendingRec: any = null;
  recBadgeCount = 0;
  recPollTimer: any = null;
  employeeCount = 0;
  userCount = 0;
  departmentCount = 0;
  documentCount = 0;

  constructor(
    private authService: AuthService,
    private webSocketService: WebSocketService,
    private employeeService: EmployeeService,
    private userService: UserService,
    private organizationService: OrganizationService,
    private documentService: DocumentService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.authService.ready();
    const p = this.authService.profile();
    if (p) {
      this.profile = p;
      this.isAdmin = p.roles.includes('ADMINISTRATOR');
      this.isRH = p.roles.includes('RH');
      this.isManager = p.roles.includes('MANAGER');
      this.isDG = p.roles.includes('DIRECTION_GENERALE');
      this.dashboardRoute = this.authService.getDashboardRoute(p.roles);
      this.employeesRoute = this.isManager && !this.isAdmin && !this.isRH ? '/employees/equipe' : '/employees';
      this.documentsRoute = this.isManager && !this.isAdmin && !this.isRH ? '/documents/equipe' : '/documents';
      this.roleLabel = this.getRoleLabel(p.roles);
      this.userEmail = p.email;
      this.userName = `${p.firstName} ${p.lastName}`;

      const token = await this.authService.getToken();
      if (token) {
        this.webSocketService.connect(token, p.id, p.roles);
        this.webSocketService.onReclamationUpdate(() => {
          this.checkReclamations();
        });
      }
    }
    this.loadCounts();
    this.startReclamationPolling();
  }

  private async loadCounts() {
    if (this.employeesRoute === '/employees/equipe') {
      try {
        const empId = this.profile?.employeeId;
        if (empId) {
          const ctx = await this.employeeService.getOrgContext(empId);
          this.employeeCount = (ctx.reports || []).length;
        }
      } catch (_) {}
    } else {
      try {
        const employees = await this.employeeService.list();
        this.employeeCount = employees.filter(e => e.status === 'ACTIVE').length;
      } catch (_) {}
    }
    try {
      const depts = await this.organizationService.listDepartments();
      this.departmentCount = depts.length;
    } catch (_) {}
    try {
      const docs = await this.documentService.search({});
      this.documentCount = docs.length;
    } catch (_) {}
    if (this.isAdmin) {
      try {
        const users = await this.userService.list();
        this.userCount = users.length;
      } catch (_) {}
    }
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    if (this.recPollTimer) clearInterval(this.recPollTimer);
    this.webSocketService.disconnect();
  }

  private startReclamationPolling() {
    this.checkReclamations();
    this.recPollTimer = setInterval(() => this.checkReclamations(), 30000);
  }

  private async checkReclamations() {
    if (this.pendingRec) return;
    try {
      const list = await this.authService.getMyReclamations();
      const unacknowledged = list.find((r: any) =>
        !r.acknowledged && (r.status === 'APPROVED' || r.status === 'REJECTED')
      );
      if (unacknowledged) {
        this.pendingRec = unacknowledged;
        this.cdr.detectChanges();
      }
    } catch (_) {}
    if (this.isAdmin || this.isManager) {
      try {
        const all = await this.authService.getReclamations();
        this.recBadgeCount = all.filter((r: any) => r.status === 'PENDING').length;
        this.cdr.detectChanges();
      } catch (_) {}
    }
  }

  async confirmReclamation() {
    if (!this.pendingRec) return;
    const rec = this.pendingRec;
    if (rec.status === 'APPROVED' && rec.newValue) {
      try {
        await this.authService.applyEmailChange(rec.id);
      } catch (e: any) {
        console.error('Email change apply failed', e);
      }
      this.pendingRec = null;
      this.cdr.detectChanges();
      setTimeout(async () => {
        try {
          await this.authService.signOut();
        } catch (_) {}
        window.location.href = '/auth/login';
      }, 2000);
    } else {
      try {
        await this.authService.acknowledgeReclamation(rec.id);
      } catch (_) {}
      this.pendingRec = null;
      this.cdr.detectChanges();
    }
  }

  private getRoleLabel(roles: string[]): string {
    if (roles.includes('ADMINISTRATOR')) return 'Administrateur';
    if (roles.includes('DIRECTION_GENERALE')) return 'Direction Générale';
    if (roles.includes('MANAGER')) return 'Manager';
    if (roles.includes('RH')) return 'Ressources Humaines';
    return '';
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

  logout() {
    this.authService.signOut();
  }

  openProfile() {
    this.newEmail = '';
    this.requestError = '';
    this.requestSuccess = false;
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.passwordError = '';
    this.passwordSuccess = false;
    this.showPassword = false;
    this.showProfile = true;
  }

  async sendEmailChangeRequest() {
    if (!this.newEmail) return;
    this.sendingRequest = true;
    this.requestError = '';
    this.requestSuccess = false;
    this.cdr.detectChanges();
    try {
      const title = 'Demande de changement d\'email : ' + this.authService.profile()?.email + ' → ' + this.newEmail;
      await this.authService.createReclamation(title, undefined, this.newEmail, 'HAUTE');
      this.requestSuccess = true;
      this.newEmail = '';
      this.cdr.detectChanges();
      setTimeout(() => {
        this.requestSuccess = false;
        this.cdr.detectChanges();
      }, 4000);
    } catch (e: any) {
      this.requestError = getErrorMessage(e, 'Erreur lors de l\'envoi de la demande');
      this.cdr.detectChanges();
    } finally {
      this.sendingRequest = false;
      this.cdr.detectChanges();
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

  async changePassword() {
    if (!this.currentPassword) {
      this.passwordError = 'Veuillez saisir votre mot de passe actuel';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'Les mots de passe ne correspondent pas';
      return;
    }
    if (this.newPassword.length < 6) {
      this.passwordError = 'Le mot de passe doit contenir au moins 6 caractères';
      return;
    }
    this.passwordChanging = true;
    this.passwordError = '';
    this.passwordSuccess = false;
    this.cdr.detectChanges();
    try {
      await this.authService.updatePassword(this.currentPassword, this.newPassword);
      this.passwordSuccess = true;
      this.passwordError = '';
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
      this.cdr.detectChanges();
      setTimeout(() => {
        this.passwordSuccess = false;
        this.cdr.detectChanges();
      }, 4000);
    } catch (e: any) {
      this.passwordError = e?.error?.message || e?.message || 'Erreur lors du changement de mot de passe';
      this.cdr.detectChanges();
    } finally {
      this.passwordChanging = false;
      this.cdr.detectChanges();
    }
  }

  isPasswordChangeDisabled(): boolean {
    return !this.currentPassword || !this.newPassword || !this.confirmPassword || this.passwordChanging;
  }
}
