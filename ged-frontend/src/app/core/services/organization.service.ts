import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface JobPosition {
  id: string;
  title: string;
  departmentId: string;
}

export interface Department {
  id: string;
  name: string;
  matriculePrefix: string;
  description: string;
  positions: JobPosition[];
}

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  constructor(private api: ApiService) {}

  listDepartments(): Promise<Department[]> {
    return this.api.get<Department[]>('/organization/departments');
  }

  createDepartment(data: { name: string; matriculePrefix: string; description: string }): Promise<Department> {
    return this.api.post<Department>('/organization/departments', data);
  }

  deleteDepartment(id: string): Promise<void> {
    return this.api.delete<void>(`/organization/departments/${id}`);
  }

  createPosition(data: { departmentId: string; title: string }): Promise<JobPosition> {
    return this.api.post<JobPosition>(`/organization/departments/${data.departmentId}/positions`, { title: data.title });
  }

  deletePosition(id: string): Promise<void> {
    return this.api.delete<void>(`/organization/positions/${id}`);
  }
}
