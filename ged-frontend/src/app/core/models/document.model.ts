export interface EmployeeDocument {
  id: string;
  employeeId: string;
  employeeFirstName: string;
  employeeLastName: string;
  employeeMatricule: string;
  employeeHasPhoto: boolean;
  documentReference: string;
  name: string;
  type: string;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  fileSize?: number | null;
  author: string;
  storagePath: string;
  ocrText: string;
}

export interface DocumentVersion {
  id: string;
  versionNumber: number;
  storagePath: string;
  uploadedBy: string;
  createdAt: string;
  ocrText: string;
}

export interface DocumentSearchParams {
  q?: string;
  type?: string;
  employeeId?: string;
  department?: string;
}
