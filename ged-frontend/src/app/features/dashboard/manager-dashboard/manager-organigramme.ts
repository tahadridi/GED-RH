import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EmployeeService, OrgContextResponse } from '../../../core/services/employee.service';
import { Employee } from '../../../core/models/employee.model';
import { environment } from '../../../../environments/environment';
import { LucideArrowLeft } from '@lucide/angular';

@Component({
  selector: 'app-manager-organigramme',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideArrowLeft],
  template: `
    <div class="p-6 bg-gray-50 min-h-screen">
      <div class="mb-6 flex items-center gap-4">
        <a routerLink="/dashboard/manager" class="p-2 rounded-lg hover:bg-gray-200 transition text-gray-600">
          <svg lucideArrowLeft class="w-5 h-5"></svg>
        </a>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Mon organigramme</h1>
          <p class="text-sm text-gray-500 mt-1">{{ reports.length }} membre(s) dans votre équipe</p>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-8 overflow-auto max-h-[calc(100vh-12rem)]">
        <div *ngIf="loading()" class="text-center py-12 text-gray-400 text-sm">Chargement...</div>
        <div *ngIf="!loading() && !selfNode" class="text-center py-12 text-gray-400 text-sm">
          Impossible de charger l'organigramme.
        </div>

        <div *ngIf="!loading() && selfNode as self" class="overflow-x-auto py-8">
          <div class="flex flex-col items-center" style="min-width: max-content;">
            <!-- Boss node -->
            <div *ngIf="boss" class="flex flex-col items-center">
              <div class="org-card org-card-manager" [routerLink]="['/employees', boss.id]">
                <div class="org-avatar">
                  <img *ngIf="boss.photoUrl" [src]="apiUrl + boss.photoUrl" alt="" class="w-full h-full object-cover rounded-full">
                  <span *ngIf="!boss.photoUrl" class="org-initials">{{ boss.firstName[0] }}{{ boss.lastName[0] }}</span>
                </div>
                <div class="org-info">
                  <p class="org-name">{{ boss.firstName }} {{ boss.lastName }}</p>
                  <p class="org-matricule">{{ boss.matricule }}</p>
                  <p class="org-position">{{ boss.position }}</p>
                </div>
              </div>
              <div class="org-line-down"></div>
            </div>

            <!-- Self node -->
            <div class="flex flex-col items-center">
              <div class="org-card org-card-self" [routerLink]="['/employees', self.id]">
                <div class="org-avatar org-avatar-self">
                  <img *ngIf="self.photoUrl" [src]="apiUrl + self.photoUrl" alt="" class="w-full h-full object-cover rounded-full">
                  <span *ngIf="!self.photoUrl" class="org-initials">{{ self.firstName[0] }}{{ self.lastName[0] }}</span>
                </div>
                <div class="org-info">
                  <p class="org-name font-bold">{{ self.firstName }} {{ self.lastName }}</p>
                  <p class="org-matricule">{{ self.matricule }}</p>
                  <p class="org-position">{{ self.position || 'Manager' }}</p>
                </div>
              </div>

              <!-- Reports row -->
              <div *ngIf="reports.length > 0" class="flex flex-col items-center">
                <div class="org-line-down"></div>
                <div class="flex gap-3" style="padding-left: 4px; padding-right: 4px;">
                  <div *ngFor="let r of reports" class="flex flex-col items-center">
                    <div class="org-line-up"></div>
                    <div class="org-card" [routerLink]="['/employees', r.id]">
                      <div class="org-avatar">
                        <img *ngIf="r.photoUrl" [src]="apiUrl + '/employees/' + r.id + '/photo/content'" alt="" class="w-full h-full object-cover rounded-full">
                        <span *ngIf="!r.photoUrl" class="org-initials">{{ r.firstName[0] }}{{ r.lastName[0] }}</span>
                      </div>
                      <div class="org-info">
                        <p class="org-name">{{ r.firstName }} {{ r.lastName }}</p>
                        <p class="org-matricule">{{ r.matricule }}</p>
                        <p class="org-position">{{ r.position }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div *ngIf="reports.length === 0" class="mt-8 text-sm text-gray-400">
                Aucun membre dans votre équipe.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .org-card { display: flex; align-items: center; gap: 12px; padding: 14px 20px; border-radius: 12px; border: 1px solid #e5e7eb; background: #fff; min-width: 240px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); cursor: pointer; transition: box-shadow .15s; }
    .org-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .org-card-self { border-color: #3b82f6; background: #eff6ff; box-shadow: 0 0 0 2px rgba(59,130,246,0.15); }
    .org-card-manager { border-color: #dbeafe; background: #f0f7ff; }
    .org-avatar { width: 40px; height: 40px; border-radius: 50%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
    .org-avatar-self { width: 44px; height: 44px; }
    .org-initials { font-weight: 600; color: #6b7280; font-size: 13px; }
    .org-info { min-width: 0; }
    .org-name { font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .org-matricule { font-size: 12px; color: #3b82f6; font-weight: 500; }
    .org-position { font-size: 12px; color: #6b7280; }
    .org-line-down { width: 2px; height: 28px; background: #cbd5e1; flex-shrink: 0; }
    .org-line-up { width: 2px; height: 20px; background: #cbd5e1; flex-shrink: 0; }
    .org-card-self .org-name { color: #2563eb; }
  `]
})
export class ManagerOrganigramme implements OnInit {
  apiUrl = environment.apiUrl;
  loading = signal(true);
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
}
