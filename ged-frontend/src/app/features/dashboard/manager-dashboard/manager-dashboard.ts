import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { Employee } from '../../../core/models/employee.model';
import { LucideUsers, LucideFolderOpen } from '@lucide/angular';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideUsers, LucideFolderOpen],
  templateUrl: './manager-dashboard.html'
})
export class ManagerDashboard implements OnInit {
  team = signal<Employee[]>([]);
  loading = signal(true);

  constructor(
    private authService: AuthService,
    private employeeService: EmployeeService
  ) {}

  get userName() {
    const p = this.authService.profile();
    return p ? `${p.firstName} ${p.lastName}` : '';
  }

  async ngOnInit() {
    try {
      const emps = await this.employeeService.list();
      this.team.set(emps);
    } finally {
      this.loading.set(false);
    }
  }

  statusLabel(s: string) {
    const m: Record<string, string> = { ACTIVE: 'Actif', INACTIVE: 'Inactif', ON_LEAVE: 'En congé', TERMINATED: 'Terminé' };
    return m[s] ?? s;
  }
}
