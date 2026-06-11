import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmployeeService } from '../../../core/services/employee.service';
import { OrganizationService, Department } from '../../../core/services/organization.service';
import { UserService } from '../../../core/services/user.service';
import { SystemUser } from '../../../core/models/user.model';
import { Employee, EmployeeStatus } from '../../../core/models/employee.model';
import { LucideX, LucideSearch } from '@lucide/angular';

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideX, LucideSearch],
  templateUrl: './employee-form.html'
})
export class EmployeeForm implements OnInit {
  @Input() employee: Employee | null = null;
  @Output() close = new EventEmitter<boolean>();

  form = {
    matricule: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    address: '',
    department: '',
    position: '',
    hireDate: '',
    status: 'ACTIVE' as EmployeeStatus,
    managerId: null as string | null
  };

  saving = false;
  error = '';
  // Only users with MANAGER role
  managers = signal<SystemUser[]>([]);
  departments = signal<Department[]>([]);
  filteredPositions = signal<string[]>([]);
  
  managerSearchQuery = '';

  statuses: EmployeeStatus[] = ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'];
  statusLabels: Record<string, string> = {
    ACTIVE: 'Actif', INACTIVE: 'Inactif', ON_LEAVE: 'En congé', TERMINATED: 'Terminé'
  };

  constructor(
    private employeeService: EmployeeService,
    private organizationService: OrganizationService,
    private userService: UserService
  ) {}

  async ngOnInit() {
    // Non-blocking load
    this.loadDepartments();
    this.loadManagers();

    if (this.employee) {
      this.form = {
        matricule: this.employee.matricule ?? '',
        firstName: this.employee.firstName ?? '',
        lastName: this.employee.lastName ?? '',
        email: this.employee.email ?? '',
        phoneNumber: this.employee.phoneNumber ?? '',
        address: this.employee.address ?? '',
        department: this.employee.department ?? '',
        position: this.employee.position ?? '',
        hireDate: this.employee.hireDate ?? '',
        status: this.employee.status ?? 'ACTIVE',
        managerId: this.employee.managerId ?? null
      };
    }
  }

  get filteredManagers() {
    const q = this.managerSearchQuery.toLowerCase();
    return this.managers().filter(m => 
      m.firstName.toLowerCase().includes(q) || 
      m.lastName.toLowerCase().includes(q) || 
      m.email.toLowerCase().includes(q)
    );
  }

  async loadDepartments() {
    try {
      // Fetching directly from 'departments' table via OrganizationService
      const depts = await this.organizationService.listDepartments();
      console.log('Departments fetched from database:', depts);
      this.departments.set(depts);
      if (this.employee || this.form.department) this.updatePositions();
    } catch (err) {
      console.error('Error fetching departments from database:', err);
      this.departments.set([]);
    }
  }

  async loadManagers() {
    try {
      const allUsers = await this.userService.list();
      // Filter only users with MANAGER role
      this.managers.set(allUsers.filter(u => u.roles.includes('MANAGER') && u.active));
    } catch (err) {
      console.error('Error loading managers:', err);
      this.managers.set([]);
    }
  }

  updatePositions() {
    const dept = this.departments().find((d: Department) => d.name === this.form.department);
    const positions = dept ? dept.positions.map((p: any) => p.title) : [];
    this.filteredPositions.set(positions);
    
    // Keep existing position value if it's valid, otherwise reset only for new employees
    if (!this.isEdit && positions.length > 0 && !positions.includes(this.form.position)) {
      this.form.position = '';
    }
  }

  onDepartmentChange() {
    this.updatePositions();
  }

  get isEdit() { return !!this.employee; }

  async save() {
    this.saving = true;
    this.error = '';
    try {
      if (this.isEdit && this.employee) {
        await this.employeeService.update(this.employee.id, this.form);
      } else {
        await this.employeeService.create(this.form);
      }
      this.close.emit(true);
    } catch (e: any) {
      this.error = e?.error?.message ?? 'Une erreur est survenue';
    } finally {
      this.saving = false;
    }
  }

  cancel() { this.close.emit(false); }
}
