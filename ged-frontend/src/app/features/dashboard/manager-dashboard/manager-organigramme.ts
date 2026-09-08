import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EmployeeService, OrgContextResponse } from '../../../core/services/employee.service';
import { Employee } from '../../../core/models/employee.model';
import { environment } from '../../../../environments/environment';
import { LucideArrowLeft, LucideGitBranch, LucideMoreVertical, LucideDownload } from '@lucide/angular';

@Component({
  selector: 'app-manager-organigramme',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideArrowLeft, LucideGitBranch, LucideMoreVertical, LucideDownload],
  template: `
    <div class="min-h-screen bg-[#F7F9FC] px-6 py-8 xl:px-10">
      <div class="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">

        <!-- Breadcrumb -->
        <nav class="flex items-center gap-2.5 text-[13px] mb-7">
          <span class="text-[#95A1B3]">GED</span>
          <span class="text-[#C3CCDA]">›</span>
          <span class="font-semibold text-[#15213D]">Mon organigramme</span>
        </nav>

        <!-- Header -->
        <header class="flex items-start justify-between gap-6 flex-wrap mb-9">
          <div class="flex items-center gap-4">
            <div class="w-[56px] h-[56px] rounded-[16px] bg-[#EDF4FF] text-[#2563EB] flex items-center justify-center shrink-0 shadow-[inset_0_0_0_1px_rgba(37,99,235,.08)]">
              <svg lucideGitBranch class="w-[24px] h-[24px]"></svg>
            </div>
            <div>
              <h1 class="text-[28px] xl:text-[30px] font-bold text-[#071334]" style="letter-spacing:-.6px; line-height:1.15">Mon organigramme</h1>
              <p class="text-[14px] text-[#8A96A9] mt-1.5">{{ reports.length }} membre(s) dans votre équipe</p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <a routerLink="/dashboard/manager"
               class="inline-flex items-center gap-2 px-4 h-[40px] rounded-[10px] bg-white border border-[#E7ECF2] text-[#15213D] text-[13px] font-semibold shadow-[0_1px_2px_rgba(16,24,40,.03)] hover:bg-[#F7F9FC] hover:border-[#D3DBE8] transition shrink-0">
              <svg lucideArrowLeft class="w-4 h-4 text-[#8A96A9]"></svg>
              Retour
            </a>
          </div>
        </header>

        <!-- Main card -->
        <div class="bg-white border border-[#E7ECF2] rounded-[16px] shadow-[0_1px_3px_rgba(16,24,40,.04),0_8px_24px_rgba(16,24,40,.04)] p-6 md:p-8 lg:p-10">
          <div class="flex items-center justify-between gap-4 mb-5">
            <div class="flex items-center gap-5 text-[12px] text-[#8A96A9]">
              <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-[#2563EB]"></span> Manager</span>
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
          <div *ngIf="!loading() && !selfNode" class="py-20 text-center text-[14px] text-[#8A96A9]">
            Impossible de charger l'organigramme.
          </div>

          <ng-container *ngIf="!loading() && selfNode as self">

            <!-- ===== VUE HIÉRARCHIQUE ===== -->
            <div class="overflow-x-auto pb-4">
              <div class="org-panel">
                <div class="org-tree">

                <!-- LEVEL 1 : directeur adjoint -->
                <div *ngIf="boss" class="flex flex-col items-center">
                  <ng-container *ngTemplateOutlet="empCard; context: { e: boss, selected: false, tag: 'Direction' }"></ng-container>
                  <div class="org-vline" style="height:28px"></div>
                </div>

                <!-- LEVEL 2 : manager -->
                <div class="flex flex-col items-center">
                  <ng-container *ngTemplateOutlet="empCard; context: { e: self, selected: true, tag: 'Manager' }"></ng-container>

                  <div *ngIf="reports.length > 0" class="flex flex-col items-center">
                    <div class="org-vline" style="height:24px"></div>
                    <div class="org-tree-row">
                      <div class="org-hbar"></div>
                      <div *ngFor="let m of reports; trackBy: trackById" class="org-tree-node">
                        <div class="org-vup"></div>
                        <ng-container *ngTemplateOutlet="empCard; context: { e: m, selected: false, tag: '' }"></ng-container>
                      </div>
                    </div>
                  </div>
                </div>

                <div *ngIf="reports.length === 0" class="mt-10 text-[13px] text-[#8A96A9]">
                  Aucun membre dans votre équipe.
                </div>
              </div>
              </div>
            </div>

          </ng-container>
        </div>
      </div>
    </div>

    <!-- Employee card template -->
    <ng-template #empCard let-e="e" let-selected="selected" let-tag="tag">
      <article class="org-card" [ngClass]="{ 'org-card--selected': selected, 'org-card--boss': !selected && e.id === boss?.id }" [routerLink]="['/employees', e.id]">
        <button type="button" class="org-card__menu" (click)="toggleMenu($event, e.id)">
          <svg lucideMoreVertical class="w-[15px] h-[15px]"></svg>
        </button>

        <div class="org-avatar" [ngClass]="{ 'org-avatar--selected': selected }">
          <img *ngIf="photoOf(e)" [src]="photoOf(e)" alt="" class="w-full h-full object-cover rounded-full">
          <span *ngIf="!photoOf(e)" class="org-initials">{{ initialsOf(e) }}</span>
        </div>

        <div class="org-body">
          <div class="org-title-row">
            <p class="org-name">{{ e.firstName }} {{ e.lastName }}</p>
            <span *ngIf="tag" class="org-pill" [ngClass]="selected ? 'org-pill--blue' : 'org-pill--soft'">{{ tag }}</span>
          </div>
          <p class="org-matricule">{{ e.matricule }}</p>
          <p class="org-position">{{ e.position || (selected ? 'Manager' : '—') }}</p>
          <span class="org-status"><span class="org-status__dot"></span>Actif</span>
        </div>

        <div *ngIf="openMenuId() === e.id" class="org-menu" (click)="$event.stopPropagation()">
          <a class="org-menu__item" [routerLink]="['/employees', e.id]">Voir le profil</a>
        </div>
      </article>
    </ng-template>

    <div *ngIf="openMenuId() !== null" class="fixed inset-0 z-30" (click)="closeMenu()"></div>
  `,
  styles: [`
    .org-tree { display: flex; flex-direction: column; align-items: center; min-width: max-content; margin: 0 auto; padding-top: 4px; }
    .org-panel { width: max-content; min-width: 100%; background: #EDF2F9; border: 1px solid #E2E8F2; border-radius: 12px; padding: 24px 32px; }
    .org-tree-row { position: relative; display: flex; justify-content: center; align-items: flex-start; gap: 24px; padding-top: 26px; }
    .org-tree-node { position: relative; display: flex; flex-direction: column; align-items: center; }

    .org-vline { width: 2px; background: #D3DBE8; flex-shrink: 0; }
    .org-hbar { position: absolute; top: 0; left: 0; right: 0; height: 2px; background: #D3DBE8; border-radius: 1px; }
    .org-vup { position: absolute; top: -26px; left: 50%; transform: translateX(-50%); width: 2px; height: 26px; background: #D3DBE8; }

    .org-card { position: relative; display: flex; align-items: flex-start; gap: 11px; padding: 13px 14px 12px; width: 100%; min-width: 0; background: #fff; border: 1px solid #E7ECF2; border-radius: 14px; box-shadow: 0 1px 2px rgba(16,24,40,.03); cursor: pointer; transition: box-shadow .2s ease, transform .2s ease, border-color .2s ease; }
    .org-card:hover { box-shadow: 0 10px 26px rgba(16,24,40,.08); transform: translateY(-2px); border-color: #D3DBE8; }
    .org-tree .org-card { width: 210px; }
    .org-card--boss { background: #F8FAFF; border-color: #DCE7FF; }
    .org-card--boss:hover { border-color: #2563EB; }
    .org-card--selected { background: #EDF4FF; border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,.12), 0 8px 20px rgba(37,99,235,.10); }
    .org-card--selected:hover { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,.14), 0 12px 26px rgba(37,99,235,.14); }

    .org-card__menu { position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 7px; color: #8A96A9; background: transparent; border: 1px solid transparent; transition: all .2s; }
    .org-card__menu:hover { background: #E9F1FF; color: #2563EB; border-color: #D3E4FF; }

    .org-avatar { width: 34px; height: 34px; border-radius: 50%; background: #E9F1FF; border: 1px solid #DCE7FF; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
    .org-avatar--selected { width: 36px; height: 36px; background: #2563EB; border-color: #2563EB; }
    .org-avatar--selected .org-initials { color: #fff; }
    .org-initials { font-weight: 600; font-size: 11px; color: #2563EB; letter-spacing: .02em; }

    .org-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; align-self: center; }
    .org-title-row { display: flex; align-items: center; gap: 7px; min-width: 0; }
    .org-name { font-weight: 600; font-size: 13px; color: #15213D; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .org-card--selected .org-name { color: #1D4ED8; }
    .org-matricule { font-size: 11px; color: #8A96A9; font-weight: 500; }
    .org-position { font-size: 11px; color: #95A1B3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .org-pill { flex-shrink: 0; font-size: 10px; font-weight: 700; letter-spacing: .03em; padding: 2px 7px; border-radius: 999px; }
    .org-pill--blue { background: #2563EB; color: #fff; }
    .org-pill--soft { background: #E9F1FF; color: #2563EB; }

    .org-status { display: inline-flex; align-items: center; gap: 5px; margin-top: 8px; align-self: flex-start; font-size: 10px; font-weight: 600; color: #16A34A; padding: 3px 8px; background: #EAFCF1; border-radius: 999px; }
    .org-status__dot { width: 5px; height: 5px; border-radius: 50%; background: #22C55E; }

    .org-menu { position: absolute; top: 38px; right: 8px; z-index: 40; background: #fff; border: 1px solid #E7ECF2; border-radius: 12px; box-shadow: 0 10px 30px rgba(16,24,40,.12); min-width: 160px; overflow: hidden; }
    .org-menu__item { display: flex; align-items: center; padding: 10px 14px; font-size: 13px; font-weight: 500; color: #15213D; transition: background .15s, color .15s; }
    .org-menu__item:hover { background: #F7F9FC; color: #2563EB; }

    @media (max-width: 900px) {
      .org-tree-row { gap: 18px; }
    }
    @media (max-width: 640px) {
      .org-tree .org-card { width: 186px; padding: 12px 12px 11px; }
      .org-tree-row { gap: 14px; }
    }
  `]
})
export class ManagerOrganigramme implements OnInit {
  apiUrl = environment.apiUrl;
  loading = signal(true);
  openMenuId = signal<number | null>(null);
  boss: any = null;
  selfNode: any = null;
  reports: Employee[] = [];

  constructor(
    private authService: AuthService,
    private employeeService: EmployeeService
  ) {}

  async ngOnInit() {
    await this.authService.ready();
    const profile = this.authService.profile();
    if (!profile) { this.loading.set(false); return; }

    this.selfNode = {
      id: profile.employeeId ?? profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      matricule: profile.matricule ?? '',
      position: '',
      department: '',
      photoUrl: profile.photoUrl
    };

    try {
      const [emps, ctx] = await Promise.all([
        this.employeeService.list(),
        profile.employeeId ? this.employeeService.getOrgContext(profile.employeeId) : null
      ]);
      this.reports = emps.filter(e => e.id !== profile.employeeId);
      if (ctx?.manager) this.boss = ctx.manager;
    } catch (e) {
      console.warn('Failed to load org chart', e);
    } finally {
      this.loading.set(false);
    }
  }

  trackById(_: number, item: any) { return item?.id; }

  initialsOf(e: any): string {
    return `${e?.firstName?.[0] ?? ''}${e?.lastName?.[0] ?? ''}`.toUpperCase();
  }

  photoOf(e: any): string {
    if (!e?.id || !e?.photoUrl) return '';
    return `${this.apiUrl}/employees/${e.id}/photo/content`;
  }

  toggleMenu(event: Event, id: number) {
    event.stopPropagation();
    this.openMenuId.set(this.openMenuId() === id ? null : id);
  }

  closeMenu() {
    this.openMenuId.set(null);
  }

  exportOrg() {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const roleOf = (e: any) => e === this.selfNode ? 'Manager' : e === this.boss ? 'Direction' : 'Membre';
    const rows: string[][] = [['Nom', 'Matricule', 'Poste', 'Rôle']];
    if (this.boss) rows.push([`${this.boss.firstName} ${this.boss.lastName}`, this.boss.matricule ?? '', this.boss.position ?? '', roleOf(this.boss)]);
    if (this.selfNode) rows.push([`${this.selfNode.firstName} ${this.selfNode.lastName}`, this.selfNode.matricule ?? '', this.selfNode.position || 'Manager', roleOf(this.selfNode)]);
    for (const m of this.reports) rows.push([`${m.firstName} ${m.lastName}`, m.matricule ?? '', m.position ?? '', roleOf(m)]);

    const blob = new Blob(['\uFEFF' + rows.map(r => r.map(esc).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mon-organigramme.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}
