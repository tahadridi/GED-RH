import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { EmployeeDocument, DocumentVersion, DocumentSearchParams } from '../models/document.model';
import { DocumentType } from '../models/user.model';

export interface OcrPreviewResult {
  tempKey: string;
  ocrText: string;
  originalFilename: string;
}

export interface CreateFromPreviewRequest {
  employeeId: string;
  documentReference: string;
  name: string;
  type: DocumentType;
  author: string;
  tempKey: string;
  ocrText: string;
}

@Injectable({ providedIn: 'root' })
export class DocumentService {
  constructor(private api: ApiService) {}

  listByEmployee(employeeId: string): Promise<EmployeeDocument[]> {
    return this.api.get<EmployeeDocument[]>(`/documents/employee/${employeeId}`);
  }

  get(id: string): Promise<EmployeeDocument> {
    return this.api.get<EmployeeDocument>(`/documents/${id}`);
  }

  search(params: DocumentSearchParams): Promise<EmployeeDocument[]> {
    const p: Record<string, string> = {};
    if (params.q) p['q'] = params.q;
    if (params.type) p['type'] = params.type;
    if (params.employeeId) p['employeeId'] = params.employeeId;
    if (params.department) p['department'] = params.department;
    return this.api.get<EmployeeDocument[]>('/documents/search', p);
  }

  /** Step 1: send file, get OCR text back for user review */
  async ocrPreview(file: File): Promise<OcrPreviewResult> {
    const form = new FormData();
    form.append('file', file);
    return this.api.postFormData<OcrPreviewResult>('/documents/ocr-preview', form);
  }

  /** Step 2: save with user-reviewed metadata (no re-upload) */
  saveFromPreview(req: CreateFromPreviewRequest): Promise<EmployeeDocument> {
    return this.api.post<EmployeeDocument>('/documents', req);
  }

  /** Legacy: upload + save in one step (kept for version uploads) */
  upload(employeeId: string, file: File, name: string, type: DocumentType, author: string, documentReference: string): Promise<EmployeeDocument> {
    const form = new FormData();
    const data = { employeeId, documentReference, name, type, author, storagePath: '' };
    form.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    form.append('file', file);
    return this.api.postFormData<EmployeeDocument>('/documents', form);
  }

  addVersion(documentId: string, file: File, uploadedBy: string): Promise<DocumentVersion> {
    const form = new FormData();
    form.append('file', file);
    form.append('uploadedBy', uploadedBy);
    return this.api.postFormDataVersion<DocumentVersion>(`/documents/${documentId}/versions`, form);
  }

  listVersions(documentId: string): Promise<DocumentVersion[]> {
    return this.api.get<DocumentVersion[]>(`/documents/${documentId}/versions`);
  }

  async download(documentId: string, filename: string): Promise<void> {
    const blob = await this.api.downloadBlob(`/documents/${documentId}/content`);
    this.triggerDownload(blob, filename);
  }

  async downloadVersion(versionId: string, filename: string): Promise<void> {
    const blob = await this.api.downloadBlob(`/documents/versions/${versionId}/content`);
    this.triggerDownload(blob, filename);
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  delete(id: string): Promise<void> {
    return this.api.delete<void>(`/documents/${id}`);
  }
}
