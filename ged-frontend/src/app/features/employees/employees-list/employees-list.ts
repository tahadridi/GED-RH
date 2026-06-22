import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EmployeeService } from '../../../core/services/employee.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { OrganizationService } from '../../../core/services/organization.service';
import { Employee, EmployeeStatus } from '../../../core/models/employee.model';
import { Page } from '../../../core/models/page.model';
import { EmployeeForm } from '../employee-form/employee-form';
import { environment } from '../../../../environments/environment';
import {
  LucideUserPlus, LucidePencil, LucideTrash2, LucideSearch,
  LucideFolderOpen, LucideChevronUp, LucideChevronDown, LucideFilter,
  LucideChevronLeft, LucideChevronRight, LucideMail, LucidePhone,
  LucideChevronsUpDown
} from '@lucide/angular';

type SortField = 'matricule' | 'firstName' | 'department' | 'status' | 'hireDate';

@Component({
  selector: 'app-employees-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, EmployeeForm,
    LucideUserPlus, LucidePencil, LucideTrash2, LucideSearch,
    LucideFolderOpen, LucideChevronUp, LucideChevronDown, LucideFilter,
    LucideChevronLeft, LucideChevronRight, LucideMail, LucidePhone
  ],
  templateUrl: './employees-list.html'
})
export class EmployeesList implements OnInit {
  apiUrl = environment.apiUrl;
  page = signal<Page<Employee>>({ content: [], totalElements: 0, totalPages: 0, size: 10, number: 0, first: true, last: true, empty: true });
  users = signal<Record<string, string>>({});

  searchQuery = '';
  filterDepartment = '';
  filterStatus: EmployeeStatus | '' = '';
  sortField: SortField = 'matricule';
  sortDir: 'asc' | 'desc' = 'asc';

  loading = signal(true);
  showForm = signal(false);
  editingEmployee = signal<Employee | null>(null);

  currentPage = signal(1);

  departments: string[] = [];
  statuses: EmployeeStatus[] = ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'];
  statusLabels: Record<string, string> = {
    ACTIVE: 'Actif', INACTIVE: 'Inactif', ON_LEAVE: 'En congé', TERMINATED: 'Terminé'
  };

  // Computed from page
  totalPages = computed(() => this.page().totalPages);
  employees = computed(() => this.page().content);
  totalElements = computed(() => this.page().totalElements);
  visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const delta = 2;
    let start = Math.max(1, current - delta);
    let end = Math.min(total, current + delta);
    if (end - start < 4) {
      if (start === 1) end = Math.min(total, start + 4);
      else if (end === total) start = Math.max(1, end - 4);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  constructor(
    private employeeService: EmployeeService,
    private userService: UserService,
    private authService: AuthService,
    private orgService: OrganizationService
  ) {}

  get canManageEmployees(): boolean {
    return this.authService.isAdmin() || this.authService.isRH();
  }

  async ngOnInit() {
    await Promise.all([this.loadEmployees(), this.loadUsers(), this.loadDepartments()]);
  }

  async loadUsers() {
    try {
      const list = await this.userService.list();
      const map: Record<string, string> = {};
      list.forEach(u => map[u.id] = `${u.firstName} ${u.lastName}`);
      this.users.set(map);
    } catch { this.users.set({}); }
  }

  async loadDepartments() {
    try {
      const depts = await this.orgService.listDepartments();
      this.departments = depts.map(d => d.name).filter(Boolean).sort();
    } catch {}
  }

  async loadEmployees() {
    this.loading.set(true);
    try {
      const params: Record<string, string> = {
        page: String(this.currentPage() - 1),
        size: '10',
        sort: this.sortField + ',' + this.sortDir
      };
      if (this.searchQuery) params['search'] = this.searchQuery;
      if (this.filterDepartment) params['department'] = this.filterDepartment;
      if (this.filterStatus) params['status'] = this.filterStatus;

      const result = await this.employeeService.listPaginated(params);
      this.page.set(result);
    } finally {
      this.loading.set(false);
    }
  }

  applyFilter() {
    this.currentPage.set(1);
    this.loadEmployees();
  }

  sortBy(field: SortField) {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = 'asc';
    }
    this.applyFilter();
  }

  clearFilters() {
    this.searchQuery = '';
    this.filterDepartment = '';
    this.filterStatus = '';
    this.applyFilter();
  }

  openCreate() {
    this.editingEmployee.set(null);
    this.showForm.set(true);
  }

  openEdit(emp: Employee) {
    this.editingEmployee.set({ ...emp });
    this.showForm.set(true);
  }

  async deactivate(id: string) {
    if (!confirm('Désactiver cet employé ?')) return;
    await this.employeeService.delete(id);
    await this.loadEmployees();
  }

  onFormClose(saved: boolean) {
    this.showForm.set(false);
    if (saved) this.loadEmployees();
  }

  statusClass(s: string) {
    const m: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-700',
      INACTIVE: 'bg-gray-100 text-gray-600',
      ON_LEAVE: 'bg-yellow-100 text-yellow-700',
      TERMINATED: 'bg-red-100 text-red-600'
    };
    return m[s] ?? '';
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadEmployees();
  }

  nextPage() {
    this.goToPage(this.currentPage() + 1);
  }

  prevPage() {
    this.goToPage(this.currentPage() - 1);
  }
}
