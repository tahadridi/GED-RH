import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmployeeService } from '../../../core/services/employee.service';
import { OrganizationService, Department } from '../../../core/services/organization.service';
import { AuthService } from '../../../core/services/auth.service';
import { Employee, EmployeeStatus } from '../../../core/models/employee.model';
import { LucideX, LucideSearch, LucideCheck, LucideChevronDown, LucideChevronRight, LucideCamera, LucideUserPlus } from '@lucide/angular';
import { getErrorMessage } from '../../../core/utils/error.utils';

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideX, LucideSearch, LucideCheck, LucideChevronDown, LucideChevronRight, LucideCamera, LucideUserPlus],
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
  photoFile: File | null = null;
  photoPreview: string | null = null;

  allEmployees = signal<Employee[]>([]);
  selectedReportIds = signal<Set<string>>(new Set());
  
  departments = signal<Department[]>([]);
  filteredPositions = signal<string[]>([]);
  
  managerSearchQuery = '';
  reportSearchQuery = '';
  expandedDepts = new Set<string>();

  statuses: EmployeeStatus[] = ['ACTIVE', 'ON_LEAVE', 'TERMINATED'];
  statusLabels: Record<string, string> = {
    ACTIVE: 'Actif', ON_LEAVE: 'En congé', TERMINATED: 'Terminé'
  };

  constructor(
    private employeeService: EmployeeService,
    private organizationService: OrganizationService,
    private authService: AuthService
  ) {}

  get isAdmin(): boolean { return this.authService.isAdmin(); }

  async ngOnInit() {
    // Non-blocking load
    this.loadDepartments();
    this.loadAllEmployees();

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
      if (this.employee.directReportIds) {
        this.selectedReportIds.set(new Set(this.employee.directReportIds));
      }
    }
  }

  get filteredManagers() {
    const q = this.managerSearchQuery.toLowerCase();
    return this.allEmployees().filter(e => 
      e.id !== this.employee?.id && 
      (e.position || '').toLowerCase().includes('responsable') &&
      (e.firstName.toLowerCase().includes(q) || 
       e.lastName.toLowerCase().includes(q) || 
       e.email.toLowerCase().includes(q) ||
       e.matricule.toLowerCase().includes(q))
    );
  }

  get filteredPotentialReports() {
    const q = this.reportSearchQuery.toLowerCase();
    // Cannot be their own manager, and cannot be their own report
    return this.allEmployees().filter(e => 
      e.id !== this.employee?.id && 
      e.id !== this.form.managerId &&
      (e.firstName.toLowerCase().includes(q) || 
       e.lastName.toLowerCase().includes(q) || 
       e.email.toLowerCase().includes(q) ||
       e.matricule.toLowerCase().includes(q))
    );
  }

  get groupedPotentialReports() {
    const employees = this.filteredPotentialReports;
    const groups: Record<string, Employee[]> = {};
    
    employees.forEach(e => {
      const dept = e.department || 'Sans service';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(e);
    });

    return Object.entries(groups)
      .map(([dept, employees]) => ({ dept, employees }))
      .sort((a, b) => a.dept.localeCompare(b.dept));
  }

  async loadDepartments() {
    try {
      const depts = await this.organizationService.listDepartments();
      this.departments.set(depts);
      if (this.employee || this.form.department) this.updatePositions();
    } catch (err) {
      console.error('Error fetching departments:', err);
      this.departments.set([]);
    }
  }

  async loadAllEmployees() {
    try {
      const emps = await this.employeeService.list();
      this.allEmployees.set(emps);
      // Auto-expand all depts initially
      const depts = new Set(emps.map(e => e.department || 'Sans service'));
      this.expandedDepts = depts;
    } catch (err) {
      console.error('Error loading employees:', err);
      this.allEmployees.set([]);
    }
  }

  toggleReport(id: string) {
    const set = new Set(this.selectedReportIds());
    if (set.has(id)) set.delete(id);
    else set.add(id);
    this.selectedReportIds.set(set);
  }

  toggleDeptReports(dept: string, select: boolean) {
    const group = this.groupedPotentialReports.find(g => g.dept === dept);
    if (!group) return;
    
    const set = new Set(this.selectedReportIds());
    group.employees.forEach(e => {
      if (select) set.add(e.id);
      else set.delete(e.id);
    });
    this.selectedReportIds.set(set);
  }

  isDeptFullySelected(dept: string): boolean {
    const group = this.groupedPotentialReports.find(g => g.dept === dept);
    if (!group || group.employees.length === 0) return false;
    return group.employees.every(e => this.selectedReportIds().has(e.id));
  }

  updatePositions() {
    const dept = this.departments().find((d: Department) => d.name === this.form.department);
    const positions = dept ? dept.positions.map((p: any) => p.title) : [];
    this.filteredPositions.set(positions);
    
    if (!this.isEdit && positions.length > 0 && !positions.includes(this.form.position)) {
      this.form.position = '';
    }
  }

  onDepartmentChange() {
    this.updatePositions();
  }

  get isEdit() { return !!this.employee; }

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.photoFile = file;
    const reader = new FileReader();
    reader.onload = () => this.photoPreview = reader.result as string;
    reader.readAsDataURL(file);
  }

  async save() {
    this.saving = true;
    this.error = '';
    try {
      let savedEmployee: Employee;
      if (this.isEdit && this.employee) {
        savedEmployee = await this.employeeService.update(this.employee.id, this.form);
      } else {
        savedEmployee = await this.employeeService.create(this.form);
      }

      // Upload photo if selected
      if (this.photoFile) {
        await this.employeeService.uploadPhoto(savedEmployee.id, this.photoFile);
      }

      // Assign reports
      await this.employeeService.assignReports(savedEmployee.id, Array.from(this.selectedReportIds()));

      this.close.emit(true);
    } catch (e: any) {
      this.error = getErrorMessage(e, 'Une erreur est survenue');
    } finally {
      this.saving = false;
    }
  }

  cancel() { this.close.emit(false); }
}
