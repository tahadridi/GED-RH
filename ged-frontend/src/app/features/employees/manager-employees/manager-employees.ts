import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EmployeeService, OrgContextResponse } from '../../../core/services/employee.service';
import { AuthService } from '../../../core/services/auth.service';
import { Employee, EmployeeStatus } from '../../../core/models/employee.model';
import { environment } from '../../../../environments/environment';
import {
  LucideUsers, LucideUserCheck, LucideClock, LucideUserX,
  LucideSearch, LucideFilter, LucideFolderOpen, LucideUserRound
} from '@lucide/angular';

@Component({
  selector: 'app-manager-employees',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule,
    LucideUsers, LucideUserCheck, LucideClock, LucideUserX,
    LucideSearch, LucideFilter, LucideFolderOpen, LucideUserRound
  ],
  templateUrl: './manager-employees.html'
})
export class ManagerEmployees implements OnInit {
  apiUrl = environment.apiUrl;

  team = signal<Employee[]>([]);
  orgContext = signal<OrgContextResponse | null>(null);
  loading = signal(true);

  searchQuery = '';
  filterDepartment = '';
  filterStatus: EmployeeStatus | '' = '';
  departments = signal<string[]>([]);

  statusLabels: Record<string, string> = {
    ACTIVE: 'Actif', ON_LEAVE: 'En congé', TERMINATED: 'Terminé'
  };

  directTeam = computed<Employee[]>(() => {
    const ctx = this.orgContext();
    const p = this.authService.profile();
    const empId = p?.employeeId;
    if (!ctx) {
      return this.team().filter(e => e.id !== empId);
    }
    const byId = new Map(this.team().map(e => [e.id, e]));
    return ctx.reports
      .map(r => byId.get(r.id))
      .filter((e): e is Employee => !!e && e.id !== empId);
  });

  teamActifs = computed(() => this.directTeam().filter(e => e.status === 'ACTIVE').length);
  teamOnLeave = computed(() => this.directTeam().filter(e => e.status === 'ON_LEAVE').length);
  teamTerminated = computed(() => this.directTeam().filter(e => e.status === 'TERMINATED').length);

  filtered = computed(() => {
    const q = this.searchQuery.trim().toLowerCase();
    return this.directTeam().filter(e => {
      if (this.filterStatus && e.status !== this.filterStatus) return false;
      if (this.filterDepartment && e.department !== this.filterDepartment) return false;
      if (!q) return true;
      const fields = [e.firstName, e.lastName, `${e.firstName} ${e.lastName}`, e.matricule, e.position, e.department];
      return fields.some(v => v && v.toLowerCase().includes(q));
    });
  });

  constructor(
    private employeeService: EmployeeService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    const p = this.authService.profile();
    try {
      const [team, orgCtx] = await Promise.all([
        this.employeeService.list(),
        p?.employeeId ? this.employeeService.getOrgContext(p.employeeId) : Promise.resolve(null)
      ]);
      const byId = new Map(team.map(e => [e.id, e]));
      if (orgCtx) {
        const deps = new Set<string>();
        orgCtx.reports.forEach(r => {
          const e = byId.get(r.id);
          if (e?.department) deps.add(e.department);
        });
        this.departments.set([...deps].sort());
        this.orgContext.set(orgCtx);
      }
      this.team.set(team);
    } catch {}
    this.loading.set(false);
  }

  clearFilters() {
    this.searchQuery = '';
    this.filterDepartment = '';
    this.filterStatus = '';
  }
}