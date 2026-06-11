import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EmployeeService } from '../../../core/services/employee.service';
import { DocumentService, OcrPreviewResult } from '../../../core/services/document.service';
import { Employee } from '../../../core/models/employee.model';
import { EmployeeDocument } from '../../../core/models/document.model';
import { DocumentType } from '../../../core/models/user.model';
import { EmployeeForm } from '../employee-form/employee-form';
import {
  LucideArrowLeft, LucideUpload, LucideDownload, LucideFileText,
  LucidePencil, LucideTrash2, LucideHistory, LucideX, LucideScanText,
  LucideCheck
} from '@lucide/angular';

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, EmployeeForm,
    LucideArrowLeft, LucideUpload, LucideDownload, LucideFileText,
    LucidePencil, LucideTrash2, LucideHistory, LucideX, LucideScanText,
    LucideCheck
  ],
  templateUrl: './employee-detail.html'
})
export class EmployeeDetail implements OnInit {
  employee = signal<Employee | null>(null);
  documents = signal<EmployeeDocument[]>([]);
  selectedDoc = signal<EmployeeDocument | null>(null);
  versions = signal<any[]>([]);
  loading = signal(true);
  showEditForm = signal(false);
  showUploadModal = signal(false);
  showVersionsModal = signal(false);

  // Upload wizard — step 1
  uploadStep = signal<1 | 2>(1);
  uploadFile: File | null = null;
  analyzingOcr = signal(false);
  ocrError = signal('');

  // Upload wizard — step 2 (review fields)
  uploadName = '';
  uploadType: DocumentType = 'OTHER';
  uploadRef = '';
  uploadOcrText = '';
  uploadTempKey = '';
  saving = signal(false);
  saveError = signal('');

  docTypes: DocumentType[] = [
    'PERSONAL_FILE', 'EMPLOYMENT_CONTRACT', 'PAYSLIP', 'LEAVE_REQUEST',
    'EVALUATION', 'TRAINING', 'ADMINISTRATIVE', 'OTHER'
  ];
  docTypeLabels: Record<string, string> = {
    PERSONAL_FILE: 'Dossier personnel', EMPLOYMENT_CONTRACT: 'Contrat de travail',
    PAYSLIP: 'Bulletin de paie', LEAVE_REQUEST: 'Demande de congé',
    EVALUATION: 'Évaluation', TRAINING: 'Formation',
    ADMINISTRATIVE: 'Administratif', OTHER: 'Autre'
  };

  constructor(
    private route: ActivatedRoute,
    private employeeService: EmployeeService,
    private documentService: DocumentService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    await this.load(id);
  }

  async load(id: string) {
    this.loading.set(true);
    try {
      const [emp, docs] = await Promise.all([
        this.employeeService.get(id),
        this.documentService.listByEmployee(id)
      ]);
      this.employee.set(emp);
      this.documents.set(docs);
    } finally {
      this.loading.set(false);
    }
  }

  openUploadModal() {
    this.uploadStep.set(1);
    this.uploadFile = null;
    this.uploadName = '';
    this.uploadRef = '';
    this.uploadOcrText = '';
    this.uploadTempKey = '';
    this.uploadType = 'OTHER';
    this.ocrError.set('');
    this.saveError.set('');
    this.showUploadModal.set(true);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.uploadFile = input.files[0];
      this.uploadName = this.uploadFile.name.replace(/\.[^.]+$/, '');
    }
  }

  async analyzeOcr() {
    if (!this.uploadFile) return;
    this.analyzingOcr.set(true);
    this.ocrError.set('');
    try {
      const result: OcrPreviewResult = await this.documentService.ocrPreview(this.uploadFile);
      this.uploadTempKey = result.tempKey;
      this.uploadOcrText = result.ocrText;
      this.uploadStep.set(2);
    } catch (e: any) {
      this.ocrError.set(e?.error?.message ?? 'Erreur lors de l\'analyse OCR');
    } finally {
      this.analyzingOcr.set(false);
    }
  }

  async saveDocument() {
    if (!this.employee() || !this.uploadTempKey) return;
    this.saving.set(true);
    this.saveError.set('');
    try {
      const ref = this.uploadRef || `REF-${Date.now()}`;
      await this.documentService.saveFromPreview({
        employeeId: this.employee()!.id,
        documentReference: ref,
        name: this.uploadName,
        type: this.uploadType,
        author: '',
        tempKey: this.uploadTempKey,
        ocrText: this.uploadOcrText
      });
      this.showUploadModal.set(false);
      await this.load(this.employee()!.id);
    } catch (e: any) {
      this.saveError.set(e?.error?.message ?? 'Erreur lors de l\'enregistrement');
    } finally {
      this.saving.set(false);
    }
  }

  async download(doc: EmployeeDocument) {
    await this.documentService.download(doc.id, doc.name);
  }

  async openVersions(doc: EmployeeDocument) {
    this.selectedDoc.set(doc);
    const v = await this.documentService.listVersions(doc.id);
    this.versions.set(v);
    this.showVersionsModal.set(true);
  }

  async downloadVersion(v: any) {
    await this.documentService.downloadVersion(v.id, `v${v.versionNumber}_${this.selectedDoc()?.name}`);
  }

  async deleteDoc(doc: EmployeeDocument) {
    if (!confirm(`Supprimer "${doc.name}" ?`)) return;
    await this.documentService.delete(doc.id);
    await this.load(this.employee()!.id);
  }

  onEditClose(saved: boolean) {
    this.showEditForm.set(false);
    if (saved && this.employee()) this.load(this.employee()!.id);
  }
}
