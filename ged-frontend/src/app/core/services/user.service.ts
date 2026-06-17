import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { SystemUser, CreateUserRequest, UpdateUserRequest } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private api: ApiService) {}

  list(): Promise<SystemUser[]> {
    return this.api.get<SystemUser[]>('/admin/users');
  }

  get(id: string): Promise<SystemUser> {
    return this.api.get<SystemUser>(`/admin/users/${id}`);
  }

  create(req: CreateUserRequest): Promise<SystemUser> {
    return this.api.post<SystemUser>('/admin/users', req);
  }

  update(id: string, req: UpdateUserRequest): Promise<SystemUser> {
    return this.api.put<SystemUser>(`/admin/users/${id}`, req);
  }

  deactivate(id: string): Promise<SystemUser> {
    return this.api.delete<SystemUser>(`/admin/users/${id}/deactivate`);
  }

  delete(id: string): Promise<void> {
    return this.api.delete<void>(`/admin/users/${id}`);
  }

  resetPassword(id: string): Promise<any> {
    return this.api.post<any>(`/admin/users/${id}/reset-password`, {});
  }

  assignManager(userId: string, managerId: string): Promise<SystemUser> {
    return this.api.post<SystemUser>(`/admin/users/${userId}/assign-manager/${managerId}`, {});
  }

  assignRhResponsibilities(userId: string, responsibilities: string[]): Promise<SystemUser> {
    return this.api.post<SystemUser>(`/admin/users/${userId}/rh-responsibilities`, { rhResponsibilities: responsibilities });
  }
}
