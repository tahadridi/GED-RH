import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import {
  LucideLayoutDashboard, LucideFileText,
  LucideSearch, LucideShield, LucideLogOut, LucideUser, LucideBuilding
} from '@lucide/angular';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule,
    LucideLayoutDashboard, LucideFileText,
    LucideSearch, LucideShield, LucideLogOut, LucideUser, LucideBuilding],
  template: `
    <aside class="sidebar-container">
      <div class="sidebar-header flex items-center gap-3">
        <!-- Logo with white circular background -->
        <div class="logo-circle">
          <img src="/logo.png" alt="Logo" class="logo-img">
        </div>
        <span>GED RH</span>
      </div>

      <!-- Role badge -->
      <div class="px-4 pt-3 pb-1">
        <span class="role-badge">
          {{ roleLabel }}
        </span>
      </div>

      <nav class="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <!-- Dashboard link -->
        <a [routerLink]="dashboardRoute" routerLinkActive="active-link"
           class="nav-link">
          <svg lucideLayoutDashboard class="w-4 h-4 shrink-0"></svg>
          Tableau de bord
        </a>

        <!-- Employees -->
        <a routerLink="/employees" routerLinkActive="active-link"
           class="nav-link">
          <svg lucideUser class="w-4 h-4 shrink-0"></svg>
          Employés
        </a>

        <!-- Documents -->
        <a routerLink="/documents" routerLinkActive="active-link"
           class="nav-link">
          <svg lucideFileText class="w-4 h-4 shrink-0"></svg>
          Documents
        </a>

        <!-- Search -->
        <a routerLink="/search" routerLinkActive="active-link"
           class="nav-link">
          <svg lucideSearch class="w-4 h-4 shrink-0"></svg>
          Recherche
        </a>

        <!-- Admin only -->
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
        <div class="user-info">
          <p class="user-name">{{ userName }}</p>
          <span class="user-role-badge">
            {{ roleLabel || 'Aucun rôle attribué' }}
          </span>
        </div>
        
        <div class="sidebar-divider"></div>

        <button (click)="logout()" class="logout-button">
          <svg lucideLogOut class="w-4 h-4 shrink-0"></svg>
          Déconnexion
        </button>
      </div>
    </aside>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    /* Sidebar theme (always navy, no light/dark mode override) */
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

    /* Logo circle white background */
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
    .user-name {
      font-weight: bold;
      font-size: 1rem;
      margin-bottom: 0.25rem;
      color: rgba(255, 255, 255, 0.95);
    }
    .user-role-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.625rem;
      background-color: #3a3d2e;
      color: #9ca3af;
      font-weight: 500;
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
  `]
})
export class Sidebar implements OnInit {
  @Input() userEmail = '';

  isAdmin = false;
  isRH = false;
  isManager = false;
  isDG = false;
  dashboardRoute = '/dashboard';
  roleLabel = '';
  userName = '';

  constructor(private authService: AuthService) {}

  ngOnInit() {
    const update = () => {
      const p = this.authService.profile();
      if (p) {
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
}