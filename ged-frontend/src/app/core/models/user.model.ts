export type SystemRole = 'ADMINISTRATOR' | 'DIRECTION_GENERALE' | 'MANAGER' | 'RH';
export type DocumentType =
  | 'PERSONAL_FILE'
  | 'EMPLOYMENT_CONTRACT'
  | 'PAYSLIP'
  | 'LEAVE_REQUEST'
  | 'EVALUATION'
  | 'TRAINING'
  | 'ADMINISTRATIVE'
  | 'DISCIPLINARY'
  | 'OTHER';

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
  rhResponsibilities: DocumentType[];
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  managerId?: string | null;
  roles: SystemRole[];
  rhResponsibilities: DocumentType[];
  temporaryPassword: string;
}

export interface UpdateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  active: boolean;
  managerId?: string | null;
  roles: SystemRole[];
  rhResponsibilities: DocumentType[];
}
