import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { AuthService } from '../../../core/services/auth.service';
import { SystemUser, SystemRole } from '../../../core/models/user.model';
import { Employee } from '../../../core/models/employee.model';
import { DocTypeService, DocType } from '../../../core/services/doc-type.service';
import { environment } from '../../../../environments/environment';
import { getErrorMessage } from '../../../core/utils/error.utils';
import { UiService } from '../../../core/services/ui.service';
import {
  LucideUserPlus, LucidePencil, LucideUserX, LucideKey,
  LucideX, LucideCheck, LucideTrash2, LucideSearch, LucideKeyRound,
  LucideUsers, LucideUserCheck, LucideUserCog, LucideBuilding2
} from '@lucide/angular';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideUserPlus, LucidePencil, LucideUserX, LucideKey, LucideX, LucideCheck, LucideTrash2, LucideSearch, LucideKeyRound, LucideUsers, LucideUserCheck, LucideUserCog, LucideBuilding2],
  templateUrl: './admin-users.html'
})
export class AdminUsers implements OnInit {
  users = signal<SystemUser[]>([]);
  loading = signal(true);
  apiUrl = environment.apiUrl;
  showForm = signal(false);
  editingUser = signal<SystemUser | null>(null);
  saving = signal(false);
  formError = signal('');
  resetNotif = signal<{ user: string; password: string } | null>(null);

  searchQuery = signal('');
  filterRole = signal('');
  filterStatus = signal('');

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
    private docTypeService: DocTypeService,
    private authService: AuthService,
    private ui: UiService
  ) {}

  async ngOnInit() {
    await Promise.all([this.load(), this.loadEmployees(), this.loadDocTypes()]);
  }

  private photoErrors = new Set<string>();

  hasPhotoError(u: SystemUser): boolean {
    return this.photoErrors.has(u.id);
  }

  onPhotoError(u: SystemUser) {
    this.photoErrors.add(u.id);
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

  get totalUsers() {
    return this.users().length;
  }

  get activeUsers() {
    return this.users().filter(u => u.active).length;
  }

  get managersCount() {
    return this.users().filter(u => u.roles.includes('MANAGER')).length;
  }

  get rhCount() {
    return this.users().filter(u => u.roles.includes('RH')).length;
  }

  get dgCount() {
    return this.users().filter(u => u.roles.includes('DIRECTION_GENERALE')).length;
  }

  get activePct(): number {
    return this.totalUsers ? Math.round((this.activeUsers / this.totalUsers) * 100) : 0;
  }

  get filteredUsers(): SystemUser[] {
    const q = this.searchQuery().toLowerCase().trim();
    const role = this.filterRole();
    const status = this.filterStatus();
    return this.users().filter(u => {
      const matchQ = !q ||
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      const matchRole = !role || u.roles.includes(role as SystemRole);
      const matchStatus = !status || (status === 'ACTIVE' ? u.active : !u.active);
      return matchQ && matchRole && matchStatus;
    });
  }

  clearFilters() {
    this.searchQuery.set('');
    this.filterRole.set('');
    this.filterStatus.set('');
  }

  async load() {
    this.loading.set(true);
    try {
      this.users.set(await this.userService.list());
      this.photoErrors.clear();
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

  get isAdminUser(): boolean {
    return this.authService.isAdmin();
  }

  toggleRole(role: SystemRole) {
    if (this.isAdminUser) {
      // Admin: single role selection only
      this.form.roles = this.form.roles.includes(role) ? [] : [role];
    } else {
      // RH: multiple role selection allowed
      const idx = this.form.roles.indexOf(role);
      if (idx >= 0) this.form.roles.splice(idx, 1);
      else this.form.roles.push(role);
    }
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
      this.formError.set(getErrorMessage(e, 'Une erreur est survenue'));
    } finally {
      this.saving.set(false);
    }
  }

  async deactivate(u: SystemUser) {
    if (!(await this.ui.confirm({
      title: 'Désactiver l\'utilisateur',
      message: `Voulez-vous vraiment désactiver ${u.firstName} ${u.lastName} ?`,
      danger: true,
      confirmLabel: 'Désactiver'
    }))) return;
    await this.userService.deactivate(u.id);
    await this.load();
  }

  async deleteUser(u: SystemUser) {
    if (!(await this.ui.confirm({
      title: 'Supprimer définitivement',
      message: `Voulez-vous vraiment supprimer ${u.firstName} ${u.lastName} ? Cette action est irréversible.`,
      danger: true,
      confirmLabel: 'Supprimer'
    }))) return;
    await this.userService.delete(u.id);
    await this.load();
  }

  async resetPassword(u: SystemUser) {
    if (!(await this.ui.confirm({
      title: 'Réinitialiser le mot de passe',
      message: `Réinitialiser le mot de passe de ${u.firstName} ${u.lastName} ?`,
      confirmLabel: 'Réinitialiser'
    }))) return;
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
