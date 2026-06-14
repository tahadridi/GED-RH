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
    // Get the stored filename with extension from the storagePath or use the doc name
    const blobWithType = this.ensureCorrectType(blob, filename);
    const ext = this.detectExtension(blob, filename);
    const finalName = filename.includes('.') ? filename : `${filename}${ext}`;
    this.triggerDownload(blobWithType, finalName);
  }

  async downloadVersion(versionId: string, filename: string): Promise<void> {
    const blob = await this.api.downloadBlob(`/documents/versions/${versionId}/content`);
    const blobWithType = this.ensureCorrectType(blob, filename);
    const ext = this.detectExtension(blob, filename);
    const finalName = filename.includes('.') ? filename : `${filename}${ext}`;
    this.triggerDownload(blobWithType, finalName);
  }

  async open(documentId: string, filename: string): Promise<void> {
    const blob = await this.api.downloadBlob(`/documents/${documentId}/content`);
    await this.openBlob(blob, filename);
  }

  async openVersion(versionId: string, filename: string): Promise<void> {
    const blob = await this.api.downloadBlob(`/documents/versions/${versionId}/content`);
    await this.openBlob(blob, filename);
  }

  private async openBlob(blob: Blob, filename: string): Promise<void> {
    const blobWithType = this.ensureCorrectType(blob, filename);
    const url = URL.createObjectURL(blobWithType);
    const win = window.open(url, '_blank');
    if (!win) {
      this.triggerDownload(blobWithType, filename);
    }
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  private ensureCorrectType(blob: Blob, filename: string): Blob {
    const lower = filename.toLowerCase();
    let mimeType = blob.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (lower.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (lower.endsWith('.png')) mimeType = 'image/png';
      else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mimeType = 'image/jpeg';
    }
    // Also check magic bytes if no extension
    return new Blob([blob], { type: mimeType });
  }

  private detectExtension(blob: Blob, filename: string): string {
    if (filename.includes('.')) return '';
    const type = blob.type;
    if (type === 'application/pdf') return '.pdf';
    if (type === 'image/png') return '.png';
    if (type === 'image/jpeg') return '.jpg';
    return '';
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
