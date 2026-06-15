import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Employee, CreateEmployeeRequest, UpdateEmployeeRequest } from '../models/employee.model';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  constructor(private api: ApiService) {}

  list(): Promise<Employee[]> {
    return this.api.get<Employee[]>('/employees');
  }

  get(id: string): Promise<Employee> {
    return this.api.get<Employee>(`/employees/${id}`);
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
