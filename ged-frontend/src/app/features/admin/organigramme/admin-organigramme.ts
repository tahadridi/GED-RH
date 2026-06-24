import { Component, Input, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { EmployeeService, EmployeeTreeNode } from '../../../core/services/employee.service';
import { LucideRefreshCw } from '@lucide/angular';
import { Subject, takeUntil, filter } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-org-node',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <li class="org-li" [class.org-root]="isRoot">
      <div class="org-node-wrapper">
        <div class="org-card" [routerLink]="['/employees', node.id]">
          <div class="org-avatar">
            <img *ngIf="node.photoUrl; else avatarPlaceholder" [src]="apiUrl + node.photoUrl" alt="" class="org-avatar-img">
            <ng-template #avatarPlaceholder>
              <span class="org-avatar-text">{{ initials }}</span>
            </ng-template>
          </div>
          <div class="org-info">
            <p class="org-name">{{ node.firstName }} {{ node.lastName }}</p>
            <p class="org-matricule">{{ node.matricule }}</p>
            <p class="org-position">{{ node.position || '—' }}</p>
            <p class="org-dept">{{ node.department || '' }}</p>
          </div>
        </div>
        <ul *ngIf="node.children && node.children.length > 0" class="org-children">
          <app-org-node *ngFor="let child of node.children" [node]="child"></app-org-node>
        </ul>
      </div>
    </li>
  `,
  styles: [`
    .org-li {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      padding: 0 0.5rem;
    }
    .org-li::before {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      width: 2px;
      height: 24px;
      background: #cbd5e1;
    }
    .org-li:first-child::before { left: 50%; width: 50%; }
    .org-li:last-child::before { left: 0; width: 50%; }
    .org-li:only-child::before { display: none; }
    .org-root::before { display: none; }
    .org-root > .org-node-wrapper { padding-top: 0; }
    .org-root > .org-node-wrapper::before { display: none; }

    .org-node-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      padding-top: 24px;
    }
    .org-node-wrapper::before {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      width: 2px;
      height: 24px;
      background: #cbd5e1;
    }

    .org-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 1rem;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      cursor: pointer;
      transition: all 0.2s;
      min-width: 175px;
      max-width: 220px;
      position: relative;
      z-index: 1;
    }
    .org-card:hover {
      border-color: #93c5fd;
      box-shadow: 0 4px 12px rgba(59,130,246,0.12);
      transform: translateY(-1px);
    }

    .org-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #dbeafe, #eff6ff);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }
    .org-avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .org-avatar-text {
      font-size: 0.8125rem;
      font-weight: 700;
      color: #3b82f6;
    }

    .org-info { min-width: 0; }
    .org-name {
      font-size: 0.8125rem;
      font-weight: 700;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .org-position {
      font-size: 0.6875rem;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .org-matricule {
      font-size: 0.625rem;
      font-weight: 600;
      color: #3b82f6;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .org-dept {
      font-size: 0.625rem;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .org-children {
      display: flex;
      justify-content: center;
      padding: 0;
      margin: 0;
      list-style: none;
      position: relative;
      padding-top: 0;
    }
    .org-children::before {
      content: '';
      position: absolute;
      top: 0;
      left: 10%;
      width: 80%;
      height: 2px;
      background: #cbd5e1;
    }
  `]
})
export class OrgNode {
  @Input() node!: EmployeeTreeNode;
  @Input() isRoot = false;
  apiUrl = environment.apiUrl;

  get initials(): string {
    return (this.node.firstName?.charAt(0) || '') + (this.node.lastName?.charAt(0) || '');
  }
}

@Component({
  selector: 'app-admin-organigramme',
  standalone: true,
  imports: [CommonModule, RouterModule, OrgNode, LucideRefreshCw],
  template: `
    <div class="p-8">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Organigramme</h1>
          <p class="text-sm text-gray-500 mt-1">Structure hierarchique de l'entreprise.</p>
        </div>
        <button (click)="load()" [disabled]="loading()"
          class="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
          <svg lucideRefreshCw class="w-4 h-4" [class.animate-spin]="loading()"></svg>
          {{ loading() ? 'Chargement...' : '' }}
        </button>
      </div>

      <div class="mb-6 h-px bg-gradient-to-r from-blue-400 via-purple-400 to-transparent"></div>

      <div *ngIf="loading()" class="text-center py-12 text-gray-400 text-sm">Chargement...</div>

      <div *ngIf="!loading() && roots().length === 0" class="text-center py-20">
        <p class="text-gray-400">Aucune donnee hierarchique.</p>
      </div>

      <div *ngIf="!loading() && roots().length > 0" class="org-tree-wrapper">
        <ul class="org-tree">
          <app-org-node *ngFor="let root of roots()" [node]="root" [isRoot]="true"></app-org-node>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .org-tree-wrapper {
      overflow-x: auto;
      padding: 1.5rem 0;
    }
    .org-tree {
      display: flex;
      justify-content: center;
      padding: 0;
      margin: 0;
      list-style: none;
      position: relative;
    }
  `]
})
export class AdminOrganigramme implements OnInit, OnDestroy {
  roots = signal<EmployeeTreeNode[]>([]);
  loading = signal(true);
  private destroy$ = new Subject<void>();

  constructor(
    private employeeService: EmployeeService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.load();
    // Auto-reload when navigating back to this page
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => this.load());
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async load() {
    this.loading.set(true);
    try {
      this.roots.set(await this.employeeService.getHierarchy());
    } finally {
      this.loading.set(false);
    }
  }
}
