import { DocumentType } from './user.model';

export interface EmployeeDocument {
  id: string;
  documentReference: string;
  name: string;
  type: DocumentType;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  author: string;
  storagePath: string;
  ocrText: string;
  employee: { id: string } | null;
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
  type?: DocumentType;
  employeeId?: string;
  department?: string;
}
