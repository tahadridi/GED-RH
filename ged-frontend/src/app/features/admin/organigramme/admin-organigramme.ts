import { Component, Input, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { EmployeeService, EmployeeTreeNode } from '../../../core/services/employee.service';
import { LucideRefreshCw, LucideUsers, LucideGitBranch, LucideMoreVertical, LucideDownload } from '@lucide/angular';
import { Subject, takeUntil, filter } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-org-node',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideMoreVertical],
  template: `
    <li class="org-node" [class.org-root]="isRoot">
      <article class="org-card" [routerLink]="['/employees', node.id]">
        <button type="button" class="org-card__menu" (click)="menu.toggle($event, node.id)">
          <svg lucideMoreVertical class="w-[15px] h-[15px]"></svg>
        </button>

        <div class="org-avatar">
          <img *ngIf="photoSrc" [src]="photoSrc" alt="" class="w-full h-full object-cover rounded-full">
          <span *ngIf="!photoSrc" class="org-initials">{{ initials }}</span>
        </div>

        <div class="org-body">
          <div class="org-title-row">
            <p class="org-name">{{ node.firstName }} {{ node.lastName }}</p>
          </div>
          <p class="org-matricule">{{ node.matricule }}</p>
          <p class="org-position">{{ node.position || '—' }}</p>
          <span class="org-status"><span class="org-status__dot"></span>Actif</span>
        </div>

        <div *ngIf="menu.openId() === node.id" class="org-menu" (click)="$event.stopPropagation()">
          <a class="org-menu__item" [routerLink]="['/employees', node.id]">Voir le profil</a>
        </div>
      </article>

      <ul *ngIf="node.children?.length" class="org-children">
        <app-org-node *ngFor="let c of node.children" [node]="c" [menu]="menu"></app-org-node>
      </ul>
    </li>
  `,
  styles: [`
    :host { display: block; }

    .org-node {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      padding: 22px 10px 0;
    }

    .org-node:not(.org-root)::before {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      width: 0;
      height: 22px;
      border-left: 2px solid #D3DBE8;
    }

    .org-card {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 11px;
      padding: 13px 14px 12px;
      background: #fff;
      border: 1px solid #E7ECF2;
      border-radius: 14px;
      box-shadow: 0 1px 2px rgba(16,24,40,.03);
      cursor: pointer;
      transition: box-shadow .2s ease, transform .2s ease, border-color .2s ease;
      width: 210px;
      position: relative;
      z-index: 2;
    }
    .org-card:hover {
      box-shadow: 0 10px 26px rgba(16,24,40,.08);
      transform: translateY(-2px);
      border-color: #D3DBE8;
    }

    .org-card__menu { position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 7px; color: #8A96A9; background: transparent; border: 1px solid transparent; transition: all .2s; }
    .org-card__menu:hover { background: #E9F1FF; color: #2563EB; border-color: #D3E4FF; }

    .org-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #E9F1FF;
      border: 1px solid #DCE7FF;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }
    .org-initials { font-size: .68rem; font-weight: 600; color: #2563EB; letter-spacing: .02em; }

    .org-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; align-self: center; }
    .org-title-row { display: flex; align-items: center; gap: 7px; min-width: 0; }
    .org-name {
      font-size: 13px;
      font-weight: 600;
      color: #15213D;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .org-matricule { font-size: 11px; color: #8A96A9; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .org-position {
      font-size: 11px;
      color: #95A1B3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .org-status { display: inline-flex; align-items: center; gap: 5px; margin-top: 8px; align-self: flex-start; font-size: 10px; font-weight: 600; color: #16A34A; padding: 3px 8px; background: #EAFCF1; border-radius: 999px; }
    .org-status__dot { width: 5px; height: 5px; border-radius: 50%; background: #22C55E; }

    .org-menu { position: absolute; top: 38px; right: 8px; z-index: 40; background: #fff; border: 1px solid #E7ECF2; border-radius: 12px; box-shadow: 0 10px 30px rgba(16,24,40,.12); min-width: 160px; overflow: hidden; }
    .org-menu__item { display: flex; align-items: center; padding: 10px 14px; font-size: 13px; font-weight: 500; color: #15213D; transition: background .15s, color .15s; }
    .org-menu__item:hover { background: #F7F9FC; color: #2563EB; }

    .org-children {
      display: flex;
      justify-content: center;
      list-style: none;
      margin: 0;
      padding: 0;
      position: relative;
    }

    .org-children::before {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      right: 50%;
      height: 0;
      border-top: 2px solid #D3DBE8;
    }
    .org-children > :first-child::after {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      right: 0;
      border-top: 2px solid #D3DBE8;
    }
    .org-children > :last-child::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 50%;
      border-top: 2px solid #D3DBE8;
    }
    .org-children > :only-child::after,
    .org-children > :only-child::before {
      display: none;
    }
  `]
})
export class OrgNode {
  @Input() node!: EmployeeTreeNode;
  @Input() isRoot = false;
  @Input() menu!: { openId: () => string | null; toggle: (e: Event, id: string) => void };
  apiUrl = environment.apiUrl;

  get initials(): string {
    return ((this.node.firstName?.charAt(0) || '') + (this.node.lastName?.charAt(0) || '')).toUpperCase();
  }

  get photoSrc(): string {
    return this.node.photoUrl ? `${this.apiUrl}/employees/${this.node.id}/photo/content` : '';
  }
}

@Component({
  selector: 'app-admin-organigramme',
  standalone: true,
  imports: [CommonModule, RouterModule, OrgNode, LucideRefreshCw, LucideUsers, LucideGitBranch, LucideDownload],
  template: `
    <div class="min-h-screen bg-[#F7F9FC] text-[#17233C] font-[Inter,system-ui,Arial,sans-serif] px-6 py-8 xl:px-10">
      <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">

        <!-- Breadcrumb -->
        <nav class="flex items-center gap-2.5 text-[13px] mb-7">
          <span class="text-[#95A1B3]">GED</span>
          <span class="text-[#C3CCDA]">›</span>
          <span class="font-semibold text-[#15213D]">Organigramme</span>
        </nav>

        <!-- Header -->
        <header class="flex justify-between items-end gap-6 flex-wrap mb-9">
          <div class="flex items-center gap-4">
            <div class="w-[56px] h-[56px] rounded-[16px] bg-[#EDF4FF] text-[#2563EB] flex items-center justify-center shrink-0 shadow-[inset_0_0_0_1px_rgba(37,99,235,.08)]">
              <svg lucideGitBranch class="w-[24px] h-[24px]"></svg>
            </div>
            <div>
              <h1 class="text-[28px] xl:text-[30px] font-bold text-[#071334]" style="letter-spacing:-.6px; line-height:1.15">Organigramme</h1>
              <p class="text-[14px] text-[#8A96A9] mt-1.5">Structure hiérarchique de l'entreprise.</p>
            </div>
          </div>

          <button (click)="load()" [disabled]="loading()"
            class="inline-flex items-center gap-2 px-4 h-[40px] rounded-[10px] bg-white border border-[#E7ECF2] text-[#15213D] text-[13px] font-semibold shadow-[0_1px_2px_rgba(16,24,40,.03)] hover:bg-[#F7F9FC] hover:border-[#D3DBE8] disabled:opacity-50 transition shrink-0">
            <svg lucideRefreshCw class="w-4 h-4 text-[#8A96A9]" [class.animate-spin]="loading()"></svg>
            Actualiser
          </button>
        </header>

        <!-- Main card -->
        <div class="bg-white border border-[#E7ECF2] rounded-[16px] shadow-[0_1px_3px_rgba(16,24,40,.04),0_8px_24px_rgba(16,24,40,.04)] p-6 md:p-8 lg:p-10">
          <div class="flex items-center justify-between gap-4 mb-5">
            <div class="flex items-center gap-5 text-[12px] text-[#8A96A9]">
              <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-[#22C55E]"></span> Actif</span>
            </div>
            <button
              (click)="exportOrg()"
              class="inline-flex items-center gap-2 px-4 h-[38px] rounded-[9px] bg-white border border-[#E7ECF2] text-[#2563EB] text-[13px] font-semibold hover:bg-[#EDF4FF] hover:border-[#2563EB] transition">
              <svg lucideDownload class="w-[15px] h-[15px]"></svg>
              Exporter
            </button>
          </div>

          <div *ngIf="loading()" class="py-20 text-center text-[14px] text-[#8A96A9]">Chargement...</div>

          <div *ngIf="!loading() && roots().length === 0" class="py-16 text-center">
            <div class="w-16 h-16 bg-[#EDF2F9] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#E7ECF2]">
              <svg lucideUsers class="w-8 h-8 text-[#9AA5B7]"></svg>
            </div>
            <h3 class="text-[#15213D] font-bold mb-1">Aucune donnée hiérarchique</h3>
            <p class="text-[#8A96A9] text-[13px]">Aucun employé n'a encore de responsable défini.</p>
          </div>

          <div *ngIf="!loading() && roots().length > 0" class="org-tree-wrapper">
            <ul class="org-tree">
              <app-org-node *ngFor="let root of roots()" [node]="root" [isRoot]="true" [menu]="menu"></app-org-node>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div *ngIf="menu.openId() !== null" class="fixed inset-0 z-30" (click)="menu.close()"></div>
  `,
  styles: [`
    .org-tree-wrapper {
      overflow-x: auto;
      padding: 1rem;
      background: #EDF2F9;
      border: 1px solid #E2E8F2;
      border-radius: 12px;
    }
    .org-tree {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      gap: 1.5rem;
      width: max-content;
      min-width: 100%;
      margin: 0 auto;
      padding: 0;
      list-style: none;
    }
  `]
})
export class AdminOrganigramme implements OnInit, OnDestroy {
  roots = signal<EmployeeTreeNode[]>([]);
  loading = signal(true);

  menu = {
    openId: signal<string | null>(null),
    toggle: (e: Event, id: string) => {
      e.stopPropagation();
      const current = this.menu.openId();
      this.menu.openId.set(current === id ? null : id);
    },
    close: () => this.menu.openId.set(null)
  };

  private destroy$ = new Subject<void>();

  constructor(
    private employeeService: EmployeeService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.load();
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

  exportOrg() {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows: string[][] = [['Nom', 'Matricule', 'Poste', 'Département', 'Niveau']];
    const walk = (nodes: EmployeeTreeNode[], level: number) => {
      for (const n of nodes) {
        rows.push([`${n.firstName} ${n.lastName}`, n.matricule ?? '', n.position ?? '', n.department ?? '', String(level)]);
        if (n.children?.length) walk(n.children, level + 1);
      }
    };
    walk(this.roots(), 1);

    const blob = new Blob(['\uFEFF' + rows.map(r => r.map(esc).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'organigramme.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}
