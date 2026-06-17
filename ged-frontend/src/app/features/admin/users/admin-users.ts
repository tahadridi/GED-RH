import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { SystemUser, SystemRole } from '../../../core/models/user.model';
import { Employee } from '../../../core/models/employee.model';
import { DocTypeService, DocType } from '../../../core/services/doc-type.service';
import {
  LucideUserPlus, LucidePencil, LucideUserX, LucideKey,
  LucideX, LucideCheck, LucideTrash2, LucideSearch
} from '@lucide/angular';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideUserPlus, LucidePencil, LucideUserX, LucideKey, LucideX, LucideCheck, LucideTrash2, LucideSearch],
  templateUrl: './admin-users.html'
})
export class AdminUsers implements OnInit {
  users = signal<SystemUser[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editingUser = signal<SystemUser | null>(null);
  saving = signal(false);
  formError = signal('');
  resetNotif = signal<{ user: string; password: string } | null>(null);

  allRoles: SystemRole[] = ['ADMINISTRATOR', 'DIRECTION_GENERALE', 'MANAGER', 'RH'];
  roleLabels: Record<string, string> = {
    ADMINISTRATOR: 'Administrateur', DIRECTION_GENERALE: 'Direction Générale',
    MANAGER: 'Manager', RH: 'Ressources Humaines'
  };
  availableDocTypes = signal<DocType[]>([]);

  private nameToEnum: Record<string, string> = {
    'Dossier': 'PERSONAL_FILE',
    'Contrat': 'EMPLOYMENT_CONTRACT',
    'Paie': 'PAYSLIP',
    'Congés': 'LEAVE_REQUEST',
    'Évaluation': 'EVALUATION',
    'Formation': 'TRAINING',
    'Administrative': 'ADMINISTRATIVE',
    'Disciplinaire': 'DISCIPLINARY',
    'Autre': 'OTHER'
  };

  private enumToName: Record<string, string> = {
    'PERSONAL_FILE': 'Dossier',
    'EMPLOYMENT_CONTRACT': 'Contrat',
    'PAYSLIP': 'Paie',
    'LEAVE_REQUEST': 'Congés',
    'EVALUATION': 'Évaluation',
    'TRAINING': 'Formation',
    'ADMINISTRATIVE': 'Administrative',
    'DISCIPLINARY': 'Disciplinaire',
    'OTHER': 'Autre'
  };

  form = {
    email: '', firstName: '', lastName: '',
    temporaryPassword: '', active: true,
    managerId: null as string | null,
    employeeId: null as string | null,
    roles: [] as SystemRole[],
    rhResponsibilities: [] as string[]  // stores French names for UI, mapped to enum for backend
  };

  allEmployees: Employee[] = [];
  employeePickerSearchQuery = '';
  managerSearchQuery = '';

  constructor(
    private userService: UserService,
    private employeeService: EmployeeService,
    private docTypeService: DocTypeService
  ) {}

  async ngOnInit() {
    await Promise.all([this.load(), this.loadEmployees(), this.loadDocTypes()]);
  }

  get filteredManagers() {
    const q = this.managerSearchQuery.toLowerCase();
    return this.users().filter(u => 
      u.active && 
      u.roles.includes('MANAGER') &&
      (u.firstName.toLowerCase().includes(q) || u.lastName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    );
  }

  get filteredEmployeesForPicker() {
    const q = this.employeePickerSearchQuery.toLowerCase();
    // Get list of employee IDs that already have a user account
    const existingAccountEmployeeIds = this.users().map(u => u.employeeProfileId).filter(id => !!id);

    return this.allEmployees.filter(e => 
      !existingAccountEmployeeIds.includes(e.id) && 
      (e.firstName.toLowerCase().includes(q) || 
       e.lastName.toLowerCase().includes(q) || 
       (e.matricule && e.matricule.toLowerCase().includes(q)))
    );
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
    } catch (e) {
      console.error('Failed to load employees', e);
    }
  }

  async loadDocTypes() {
    try {
      this.availableDocTypes.set(await this.docTypeService.list());
    } catch (e) {
      console.error('Failed to load doc types', e);
    }
  }

  openCreate() {
    this.editingUser.set(null);
    this.form = { 
      email: '', firstName: '', lastName: '', 
      temporaryPassword: '', active: true, 
      managerId: null, employeeId: null,
      roles: [], rhResponsibilities: [] 
    };
    this.employeePickerSearchQuery = '';
    this.formError.set('');
    this.showForm.set(true);
  }

  selectEmployee(e: Employee) {
    this.form.firstName = e.firstName;
    this.form.lastName = e.lastName;
    this.form.email = e.email || '';
    this.form.employeeId = e.id;
    
    // Auto-link manager from employee profile if possible
    const managerUser = this.users().find(u => u.employeeProfileId === e.managerId);
    this.form.managerId = managerUser ? managerUser.id : null;
    this.employeePickerSearchQuery = '';
  }

  openEdit(u: SystemUser) {
    this.editingUser.set(u);
    this.form = {
      email: u.email, firstName: u.firstName, lastName: u.lastName,
      temporaryPassword: '', active: u.active,
      managerId: u.managerId,
      employeeId: u.employeeProfileId || null,
      roles: [...u.roles],
      rhResponsibilities: u.rhResponsibilities.map(e => this.enumToName[e] || e)
    };
    this.formError.set('');
    this.showForm.set(true);
  }

  toggleRole(role: SystemRole) {
    const idx = this.form.roles.indexOf(role);
    if (idx >= 0) this.form.roles.splice(idx, 1);
    else this.form.roles.push(role);
  }

  toggleDocType(name: string) {
    const idx = this.form.rhResponsibilities.indexOf(name);
    if (idx >= 0) this.form.rhResponsibilities.splice(idx, 1);
    else this.form.rhResponsibilities.push(name);
  }

  hasRole(role: SystemRole) { return this.form.roles.includes(role); }
  hasDocType(name: string) { return this.form.rhResponsibilities.includes(name); }

  docTypeLabel(val: string): string {
    return this.enumToName[val] || val;
  }

  async save() {
    this.saving.set(true);
    this.formError.set('');
    const rhRespEnum = this.form.rhResponsibilities.map(n => this.nameToEnum[n] || n);
    try {
      if (this.editingUser()) {
        await this.userService.update(this.editingUser()!.id, {
          email: this.form.email, firstName: this.form.firstName,
          lastName: this.form.lastName, active: this.form.active,
          managerId: this.form.managerId,
          roles: this.form.roles,
          rhResponsibilities: rhRespEnum
        });
      } else {
        await this.userService.create({
          email: this.form.email, firstName: this.form.firstName,
          lastName: this.form.lastName, temporaryPassword: this.form.temporaryPassword,
          managerId: this.form.managerId,
          employeeId: this.form.employeeId,
          roles: this.form.roles,
          rhResponsibilities: rhRespEnum
        });
      }

      this.showForm.set(false);
      await this.load();
      await this.loadEmployees();
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
    const result = await this.userService.resetPassword(u.id);
    if (result?.temporaryPassword) {
      this.resetNotif.set({ user: `${u.firstName} ${u.lastName}`, password: result.temporaryPassword });
      setTimeout(() => this.resetNotif.set(null), 8000);
    } else {
      this.resetNotif.set({ user: `${u.firstName} ${u.lastName}`, password: 'Mot de passe réinitialisé (voir email)' });
      setTimeout(() => this.resetNotif.set(null), 5000);
    }
  }
}
