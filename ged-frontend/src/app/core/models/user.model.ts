export type SystemRole = 'ADMINISTRATOR' | 'DIRECTION_GENERALE' | 'MANAGER' | 'RH';
export type DocumentType = string;

export interface SystemUser {
  id: string;
  authUid: string;
  email: string;
  firstName: string;
  lastName: string;
  active: boolean;
  managerId: string | null;
  employeeProfileId: string | null;
  roles: SystemRole[];
  rhResponsibilities: string[];
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  managerId?: string | null;
  employeeId?: string | null;
  roles: SystemRole[];
  rhResponsibilities: string[];
  temporaryPassword: string;
}

export interface UpdateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  active: boolean;
  managerId?: string | null;
  roles: SystemRole[];
  rhResponsibilities: string[];
}
