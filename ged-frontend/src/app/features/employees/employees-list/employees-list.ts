import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EmployeeService } from '../../../core/services/employee.service';
import { UserService } from '../../../core/services/user.service';
import { Employee, EmployeeStatus } from '../../../core/models/employee.model';
import { EmployeeForm } from '../employee-form/employee-form';
import {
  LucideUserPlus, LucidePencil, LucideTrash2, LucideSearch,
  LucideFolderOpen, LucideChevronUp, LucideChevronDown, LucideFilter
} from '@lucide/angular';

type SortField = 'matricule' | 'firstName' | 'department' | 'status' | 'hireDate';

@Component({
  selector: 'app-employees-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, EmployeeForm,
    LucideUserPlus, LucidePencil, LucideTrash2, LucideSearch,
    LucideFolderOpen, LucideChevronUp, LucideChevronDown, LucideFilter
  ],
  templateUrl: './employees-list.html'
})
export class EmployeesList implements OnInit {
  employees = signal<Employee[]>([]);
  filtered = signal<Employee[]>([]);
  users = signal<Record<string, string>>({}); // id -> name mapping

  searchQuery = '';
  filterDepartment = '';
  filterStatus: EmployeeStatus | '' = '';
  sortField: SortField = 'matricule';
  sortDir: 'asc' | 'desc' = 'asc';

  loading = signal(true);
  showForm = signal(false);
  editingEmployee = signal<Employee | null>(null);

  departments: string[] = [];
  statuses: EmployeeStatus[] = ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'];
  statusLabels: Record<string, string> = {
    ACTIVE: 'Actif', INACTIVE: 'Inactif', ON_LEAVE: 'En congé', TERMINATED: 'Terminé'
  };

  constructor(
    private employeeService: EmployeeService,
    private userService: UserService
  ) {}

  async ngOnInit() {
    await Promise.all([this.loadEmployees(), this.loadUsers()]);
  }

  async loadUsers() {
    try {
      const list = await this.userService.list();
      const map: Record<string, string> = {};
      list.forEach(u => map[u.id] = `${u.firstName} ${u.lastName}`);
      this.users.set(map);
    } catch { this.users.set({}); }
  }

  async loadEmployees() {
    this.loading.set(true);
    try {
      const list = await this.employeeService.list();
      this.employees.set(list);
      // Extract unique departments for filter dropdown
      this.departments = [...new Set(list.map(e => e.department).filter(Boolean))].sort();
      this.applyFilter();
    } finally {
      this.loading.set(false);
    }
  }

  applyFilter() {
    const q = this.searchQuery.toLowerCase();
    const userMap = this.users();
    let result = this.employees().filter(e => {
      const managerName = e.managerId ? (userMap[e.managerId] || '').toLowerCase() : '';
      const matchSearch = !q ||
        e.firstName.toLowerCase().includes(q) ||
        e.lastName.toLowerCase().includes(q) ||
        e.matricule.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.department ?? '').toLowerCase().includes(q) ||
        (e.position ?? '').toLowerCase().includes(q) ||
        managerName.includes(q);

      const matchDept = !this.filterDepartment || e.department === this.filterDepartment;
      const matchStatus = !this.filterStatus || e.status === this.filterStatus;

      return matchSearch && matchDept && matchStatus;
    });

    // Sort
    result = [...result].sort((a, b) => {
      let valA = '';
      let valB = '';
      if (this.sortField === 'firstName') { valA = `${a.firstName} ${a.lastName}`; valB = `${b.firstName} ${b.lastName}`; }
      else if (this.sortField === 'matricule') { valA = a.matricule; valB = b.matricule; }
      else if (this.sortField === 'department') { valA = a.department ?? ''; valB = b.department ?? ''; }
      else if (this.sortField === 'status') { valA = a.status; valB = b.status; }
      else if (this.sortField === 'hireDate') { valA = a.hireDate ?? ''; valB = b.hireDate ?? ''; }

      const cmp = valA.localeCompare(valB);
      return this.sortDir === 'asc' ? cmp : -cmp;
    });

    this.filtered.set(result);
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
    this.editingEmployee.set({ ...emp }); // pass a copy to avoid mutation
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
}
