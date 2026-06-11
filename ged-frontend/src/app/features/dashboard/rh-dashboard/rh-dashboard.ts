import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { DocumentService, OcrPreviewResult } from '../../../core/services/document.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { Employee } from '../../../core/models/employee.model';
import { DocumentType } from '../../../core/models/user.model';
import { LucideUpload, LucideScanText, LucideCheck, LucideX, LucideFileText } from '@lucide/angular';

@Component({
  selector: 'app-rh-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule,
    LucideUpload, LucideScanText, LucideCheck, LucideX, LucideFileText],
  templateUrl: './rh-dashboard.html'
})
export class RhDashboard implements OnInit {
  employees = signal<Employee[]>([]);
  responsibilities = signal<DocumentType[]>([]);
  loading = signal(true);

  // Upload wizard
  showUpload = signal(false);
  uploadStep = signal<1 | 2>(1);
  selectedEmployee: string = '';
  uploadFile: File | null = null;
  uploadName = '';
  uploadType: DocumentType = 'OTHER';
  uploadRef = '';
  uploadOcrText = '';
  uploadTempKey = '';
  analyzingOcr = signal(false);
  saving = signal(false);
  ocrError = signal('');
  saveError = signal('');

  docTypeLabels: Record<string, string> = {
    PERSONAL_FILE: 'Dossier personnel', EMPLOYMENT_CONTRACT: 'Contrat de travail',
    PAYSLIP: 'Bulletin de paie', LEAVE_REQUEST: 'Demande de congé',
    EVALUATION: 'Évaluation', TRAINING: 'Formation',
    ADMINISTRATIVE: 'Administratif', OTHER: 'Autre'
  };

  constructor(
    private authService: AuthService,
    private documentService: DocumentService,
    private employeeService: EmployeeService
  ) {}

  async ngOnInit() {
    this.responsibilities.set(this.authService.getRhResponsibilities());
    // Set default upload type to first responsibility
    if (this.responsibilities().length > 0) {
      this.uploadType = this.responsibilities()[0];
    }
    try {
      const emps = await this.employeeService.list();
      this.employees.set(emps);
    } finally {
      this.loading.set(false);
    }
  }

  get userName() {
    const p = this.authService.profile();
    return p ? `${p.firstName} ${p.lastName}` : '';
  }

  openUpload() {
    this.uploadStep.set(1);
    this.uploadFile = null;
    this.uploadName = '';
    this.uploadRef = '';
    this.uploadOcrText = '';
    this.uploadTempKey = '';
    this.selectedEmployee = '';
    this.ocrError.set('');
    this.saveError.set('');
    if (this.responsibilities().length > 0) this.uploadType = this.responsibilities()[0];
    this.showUpload.set(true);
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
      this.ocrError.set(e?.error?.message ?? 'Erreur OCR');
    } finally {
      this.analyzingOcr.set(false);
    }
  }

  async saveDocument() {
    if (!this.selectedEmployee || !this.uploadTempKey) return;
    this.saving.set(true);
    this.saveError.set('');
    try {
      await this.documentService.saveFromPreview({
        employeeId: this.selectedEmployee,
        documentReference: this.uploadRef || `REF-${Date.now()}`,
        name: this.uploadName,
        type: this.uploadType,
        author: this.authService.profile()?.email ?? '',
        tempKey: this.uploadTempKey,
        ocrText: this.uploadOcrText
      });
      this.showUpload.set(false);
    } catch (e: any) {
      this.saveError.set(e?.error?.message ?? 'Erreur enregistrement');
    } finally {
      this.saving.set(false);
    }
  }
}
