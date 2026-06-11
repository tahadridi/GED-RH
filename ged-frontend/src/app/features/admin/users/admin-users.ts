import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { SystemUser, SystemRole, DocumentType } from '../../../core/models/user.model';
import { Employee } from '../../../core/models/employee.model';
import {
  LucideUserPlus, LucidePencil, LucideUserX, LucideKey,
  LucideX, LucideCheck, LucideTrash2, LucideChevronDown, LucideChevronRight,
  LucideSearch
} from '@lucide/angular';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideUserPlus, LucidePencil, LucideUserX, LucideKey, LucideX, LucideCheck, LucideTrash2, LucideChevronDown, LucideChevronRight, LucideSearch],
  templateUrl: './admin-users.html'
})
export class AdminUsers implements OnInit {
  users = signal<SystemUser[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editingUser = signal<SystemUser | null>(null);
  saving = signal(false);
  formError = signal('');

  allRoles: SystemRole[] = ['ADMINISTRATOR', 'DIRECTION_GENERALE', 'MANAGER', 'RH'];
  allDocTypes: DocumentType[] = [
    'PERSONAL_FILE','EMPLOYMENT_CONTRACT','PAYSLIP','LEAVE_REQUEST',
    'EVALUATION','TRAINING','ADMINISTRATIVE','DISCIPLINARY','OTHER'
  ];
  roleLabels: Record<string, string> = {
    ADMINISTRATOR: 'Administrateur', DIRECTION_GENERALE: 'Direction Générale',
    MANAGER: 'Manager', RH: 'Ressources Humaines'
  };
  docTypeLabels: Record<string, string> = {
    PERSONAL_FILE: 'Dossier', EMPLOYMENT_CONTRACT: 'Contrat',
    PAYSLIP: 'Paie', LEAVE_REQUEST: 'Congés',
    EVALUATION: 'Évaluation', TRAINING: 'Formation',
    ADMINISTRATIVE: 'Administartive', DISCIPLINARY: 'Disciplinaire', OTHER: 'Autre'
  };

  form = {
    email: '', firstName: '', lastName: '',
    temporaryPassword: '', active: true,
    managerId: null as string | null,
    roles: [] as SystemRole[],
    rhResponsibilities: [] as DocumentType[]
  };

  allEmployees: Employee[] = [];
  groupedEmployees: { dept: string, employees: Employee[] }[] = [];
  selectedReports = new Set<string>();
  expandedDepts = new Set<string>();

  // Search for subordinates
  subordinateSearchQuery = '';
  managerSearchQuery = '';

  constructor(
    private userService: UserService,
    private employeeService: EmployeeService
  ) {}

  async ngOnInit() {
    await Promise.all([this.load(), this.loadEmployees()]);
  }

  get filteredManagers() {
    const q = this.managerSearchQuery.toLowerCase();
    return this.users().filter(u => 
      u.active && 
      u.roles.includes('MANAGER') &&
      (u.firstName.toLowerCase().includes(q) || u.lastName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    );
  }

  get filteredGroupedEmployees() {
    const q = this.subordinateSearchQuery.toLowerCase();
    if (!q) return this.groupedEmployees;

    return this.groupedEmployees.map(g => ({
      dept: g.dept,
      employees: g.employees.filter(e => 
        e.firstName.toLowerCase().includes(q) || 
        e.lastName.toLowerCase().includes(q) || 
        e.matricule.toLowerCase().includes(q)
      )
    })).filter(g => g.employees.length > 0);
  }

  getManagerName(id: string | null): string {
    if (!id) return '—';
    const m = this.users().find(u => u.id === id);
    return m ? `${m.firstName} ${m.lastName}` : 'Inconnu';
  }

  async load() {
    this.loading.set(true);
    try {
      this.users.set(await this.userService.list());
    } finally {
      this.loading.set(false);
    }
  }

  async loadEmployees() {
    try {
      this.allEmployees = await this.employeeService.list();
      this.groupEmployees();
    } catch (e) {
      console.error('Failed to load employees', e);
    }
  }

  groupEmployees() {
    const groups: Record<string, Employee[]> = {};
    this.allEmployees.forEach(e => {
      const dept = e.department || 'Sans service';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(e);
    });
    this.groupedEmployees = Object.entries(groups).map(([dept, employees]) => ({ dept, employees }));
    // Expand all by default
    this.groupedEmployees.forEach(g => this.expandedDepts.add(g.dept));
  }

  openCreate() {
    this.editingUser.set(null);
    this.form = { email: '', firstName: '', lastName: '', temporaryPassword: '', active: true, managerId: null, roles: [], rhResponsibilities: [] };
    this.selectedReports.clear();
    this.formError.set('');
    this.showForm.set(true);
  }

  openEdit(u: SystemUser) {
    this.editingUser.set(u);
    this.form = {
      email: u.email, firstName: u.firstName, lastName: u.lastName,
      temporaryPassword: '', active: u.active,
      managerId: u.managerId,
      roles: [...u.roles],
      rhResponsibilities: [...u.rhResponsibilities]
    };
    this.selectedReports.clear();
    if (u.employeeProfileId) {
      this.allEmployees.filter(e => e.managerId === u.employeeProfileId).forEach(e => this.selectedReports.add(e.id));
    }
    this.formError.set('');
    this.showForm.set(true);
  }

  toggleRole(role: SystemRole) {
    const idx = this.form.roles.indexOf(role);
    if (idx >= 0) this.form.roles.splice(idx, 1);
    else this.form.roles.push(role);
  }

  toggleDocType(type: DocumentType) {
    const idx = this.form.rhResponsibilities.indexOf(type);
    if (idx >= 0) this.form.rhResponsibilities.splice(idx, 1);
    else this.form.rhResponsibilities.push(type);
  }

  hasRole(role: SystemRole) { return this.form.roles.includes(role); }
  hasDocType(type: DocumentType) { return this.form.rhResponsibilities.includes(type); }

  toggleReport(empId: string) {
    if (this.selectedReports.has(empId)) this.selectedReports.delete(empId);
    else this.selectedReports.add(empId);
  }

  toggleDept(dept: string, select: boolean) {
    const group = this.groupedEmployees.find(g => g.dept === dept);
    if (!group) return;
    group.employees.forEach(e => {
      if (select) this.selectedReports.add(e.id);
      else this.selectedReports.delete(e.id);
    });
  }

  isDeptSelected(dept: string) {
    const group = this.groupedEmployees.find(g => g.dept === dept);
    return group && group.employees.every(e => this.selectedReports.has(e.id));
  }

  async save() {
    this.saving.set(true);
    this.formError.set('');
    try {
      let savedUser: SystemUser;
      if (this.editingUser()) {
        savedUser = await this.userService.update(this.editingUser()!.id, {
          email: this.form.email, firstName: this.form.firstName,
          lastName: this.form.lastName, active: this.form.active,
          managerId: this.form.managerId,
          roles: this.form.roles,
          rhResponsibilities: this.form.rhResponsibilities
        });
      } else {
        savedUser = await this.userService.create({
          email: this.form.email, firstName: this.form.firstName,
          lastName: this.form.lastName, temporaryPassword: this.form.temporaryPassword,
          managerId: this.form.managerId,
          roles: this.form.roles,
          rhResponsibilities: this.form.rhResponsibilities
        });
      }

      // If user is a manager and has an employee profile, assign reports
      if (this.hasRole('MANAGER') && savedUser.employeeProfileId) {
        await this.employeeService.assignReports(savedUser.employeeProfileId, Array.from(this.selectedReports));
      }

      this.showForm.set(false);
      await this.load();
      await this.loadEmployees(); // Refresh employee list to get updated manager links
    } catch (e: any) {
      this.formError.set(e?.error?.message ?? 'Une erreur est survenue');
    } finally {
      this.saving.set(false);
    }
  }

  async deactivate(u: SystemUser) {
    if (!confirm(`Désactiver ${u.firstName} ${u.lastName} ?`)) return;
    await this.userService.deactivate(u.id);
    await this.load();
  }

  async deleteUser(u: SystemUser) {
    if (!confirm(`Supprimer définitivement ${u.firstName} ${u.lastName} ?\nCette action est irréversible.`)) return;
    await this.userService.delete(u.id);
    await this.load();
  }

  async resetPassword(u: SystemUser) {
    if (!confirm(`Réinitialiser le mot de passe de ${u.firstName} ${u.lastName} ?`)) return;
    await this.userService.resetPassword(u.id);
    alert('Mot de passe réinitialisé avec succès.');
  }
}
