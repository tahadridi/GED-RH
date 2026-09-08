import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Employee, CreateEmployeeRequest, UpdateEmployeeRequest } from '../models/employee.model';
import { Page } from '../models/page.model';

export interface OrgContextResponse {
  manager: EmployeeTreeNode | null;
  employee: EmployeeTreeNode;
  reports: EmployeeTreeNode[];
}

export interface EmployeeTreeNode {
  id: string;
  firstName: string;
  lastName: string;
  matricule: string;
  position: string;
  department: string;
  photoUrl: string | null;
  children: EmployeeTreeNode[];
}

export interface EmployeeStats {
  total: number;
  ACTIVE: number;
  ON_LEAVE: number;
  TERMINATED: number;
  departments: number;
}

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  constructor(private api: ApiService) {}

  list(params?: Record<string, string>): Promise<Employee[]> {
    return this.api.get<Page<Employee>>('/employees', params).then(p => p.content);
  }

  stats(): Promise<EmployeeStats> {
    return this.api.get<EmployeeStats>('/employees/stats');
  }

  listPaginated(params: Record<string, string>): Promise<Page<Employee>> {
    return this.api.get<Page<Employee>>('/employees', params);
  }

  get(id: string): Promise<Employee> {
    return this.api.get<Employee>(`/employees/${id}`);
  }

  getOrgContext(id: string): Promise<OrgContextResponse> {
    return this.api.get<OrgContextResponse>(`/employees/${id}/org-context`);
  }

  getHierarchy(): Promise<EmployeeTreeNode[]> {
    return this.api.get<EmployeeTreeNode[]>('/employees/hierarchy');
  }

  create(req: CreateEmployeeRequest): Promise<Employee> {
    return this.api.post<Employee>('/employees', req);
  }

  update(id: string, req: UpdateEmployeeRequest): Promise<Employee> {
    return this.api.put<Employee>(`/employees/${id}`, req);
  }

  delete(id: string): Promise<void> {
    return this.api.delete<void>(`/employees/${id}`);
  }

  deactivate(id: string): Promise<void> {
    return this.api.post<void>(`/employees/${id}/deactivate`, {});
  }

  assignReports(managerId: string, reportIds: string[]): Promise<void> {
    return this.api.post<void>(`/employees/${managerId}/reports`, reportIds);
  }

  async uploadPhoto(employeeId: string, file: File): Promise<Employee> {
    const form = new FormData();
    form.append('file', file);
    return this.api.postFormData<Employee>(`/employees/${employeeId}/photo`, form);
  }
}
