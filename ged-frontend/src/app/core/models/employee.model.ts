export type EmployeeStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';

export interface Employee {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  department: string;
  position: string;
  hireDate: string;
  status: EmployeeStatus;
  managerId: string | null;
  managerName?: string | null;
  directReportIds?: string[];
  photoUrl?: string | null;
}

export interface CreateEmployeeRequest {
  matricule: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  department: string;
  position: string;
  hireDate: string;
  status?: EmployeeStatus;
  managerId?: string | null;
}

export interface UpdateEmployeeRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  department: string;
  position: string;
  hireDate: string;
  status?: EmployeeStatus;
  managerId?: string | null;
}
