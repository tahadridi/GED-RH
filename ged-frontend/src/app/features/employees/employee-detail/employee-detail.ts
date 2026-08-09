import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EmployeeService } from '../../../core/services/employee.service';
import { DocumentService, OcrPreviewResult } from '../../../core/services/document.service';
import { AuthService } from '../../../core/services/auth.service';
import { Employee } from '../../../core/models/employee.model';
import { environment } from '../../../../environments/environment';
import { EmployeeDocument } from '../../../core/models/document.model';
import { DocumentType } from '../../../core/models/user.model';
import { getErrorMessage } from '../../../core/utils/error.utils';
import { EmployeeForm } from '../employee-form/employee-form';
import {
  LucideUpload, LucideDownload, LucideFileText,
  LucideTrash2, LucideHistory, LucideX, LucideScanText,
  LucidePencil, LucideChevronDown, LucideChevronRight,
  LucideCheck, LucideEye, LucideSearch,
  LucideMail, LucidePhone, LucideBuilding, LucideBriefcase,
  LucideCalendar, LucideUser
} from '@lucide/angular';

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, EmployeeForm,
    LucideUpload, LucideDownload, LucideFileText,
    LucidePencil, LucideTrash2, LucideHistory, LucideX, LucideScanText,
    LucideChevronDown, LucideChevronRight,
    LucideCheck, LucideEye, LucideSearch,
    LucideMail, LucidePhone, LucideBuilding, LucideBriefcase,
    LucideCalendar, LucideUser
  ],
  templateUrl: './employee-detail.html'
})
export class EmployeeDetail implements OnInit {
  apiUrl = environment.apiUrl;
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

  // Version upload wizard — 2-step OCR review
  showVersionModal = signal(false);
  versionStep = signal<1 | 2>(1);
  versionTargetDoc = signal<EmployeeDocument | null>(null);
  versionFile: File | null = null;
  analyzingVersionOcr = signal(false);
  versionOcrError = signal('');
  versionOcrText = '';
  versionTempKey = '';
  savingVersion = signal(false);
  versionSaveError = signal('');

  // Document search & groups
  docSearchQuery = '';
  expandedDocTypes = signal<Set<string>>(new Set());

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

  typeColors: Record<string, string> = {
    PERSONAL_FILE: 'bg-blue-800 text-white',
    EMPLOYMENT_CONTRACT: 'bg-blue-800 text-white',
    PAYSLIP: 'bg-blue-800 text-white',
    LEAVE_REQUEST: 'bg-blue-800 text-white',
    EVALUATION: 'bg-blue-800 text-white',
    TRAINING: 'bg-blue-800 text-white',
    ADMINISTRATIVE: 'bg-blue-800 text-white',
    OTHER: 'bg-blue-600 text-white'
  };

  typeIconColors: Record<string, string> = {
    PERSONAL_FILE: 'text-blue-800',
    EMPLOYMENT_CONTRACT: 'text-blue-800',
    PAYSLIP: 'text-blue-800',
    LEAVE_REQUEST: 'text-blue-800',
    EVALUATION: 'text-blue-800',
    TRAINING: 'text-blue-800',
    ADMINISTRATIVE: 'text-blue-800',
    OTHER: 'text-blue-600'
  };

  typeIconBgs: Record<string, string> = {
    PERSONAL_FILE: 'bg-blue-50',
    EMPLOYMENT_CONTRACT: 'bg-blue-50',
    PAYSLIP: 'bg-blue-50',
    LEAVE_REQUEST: 'bg-blue-50',
    EVALUATION: 'bg-blue-50',
    TRAINING: 'bg-blue-50',
    ADMINISTRATIVE: 'bg-blue-50',
    OTHER: 'bg-blue-50'
  };

  docGroups = computed(() => {
    const groups = new Map<string, EmployeeDocument[]>();
    for (const doc of this.documents()) {
      const type = doc.type || 'OTHER';
      if (!groups.has(type)) groups.set(type, []);
      groups.get(type)!.push(doc);
    }
    return Array.from(groups.entries())
      .map(([type, docs]) => ({ type, label: this.docTypeLabels[type] || type, docs }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  filteredDocGroups = computed(() => {
    if (!this.docSearchQuery.trim()) return this.docGroups();
    const q = this.docSearchQuery.toLowerCase().trim();
    return this.docGroups()
      .map(g => ({ ...g, docs: g.docs.filter(d => d.name.toLowerCase().includes(q)) }))
      .filter(g => g.docs.length > 0);
  });

  statusLabel(s: string | undefined): string {
    const m: Record<string, string> = { ACTIVE: 'Actif', INACTIVE: 'Inactif', ON_LEAVE: 'En congé', TERMINATED: 'Terminé' };
    return m[s ?? ''] ?? s ?? '—';
  }

  statusClass(s: string | undefined): string {
    const m: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-700 border-green-200',
      INACTIVE: 'bg-gray-100 text-gray-600 border-gray-200',
      ON_LEAVE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      TERMINATED: 'bg-red-100 text-red-600 border-red-200'
    };
    return m[s ?? ''] ?? 'bg-gray-100 text-gray-600';
  }

  get lastActivityDate(): string {
    if (this.documents().length === 0) return '—';
    const dates = this.documents()
      .map(d => d.createdAt ? new Date(d.createdAt).getTime() : 0)
      .filter(t => t > 0)
      .sort((a, b) => b - a);
    if (dates.length === 0) return '—';
    return new Date(dates[0]).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  constructor(
    private route: ActivatedRoute,
    private employeeService: EmployeeService,
    private documentService: DocumentService,
    private authService: AuthService
  ) {}

  get canManageDocs(): boolean {
    return this.authService.isAdmin() || this.authService.isRH();
  }

  get canManageEmployees(): boolean {
    return this.authService.isAdmin() || this.authService.isRH();
  }

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
      this.expandAllDocTypes();
    } finally {
      this.loading.set(false);
    }
  }

  expandAllDocTypes() {
    const set = new Set(this.docGroups().map(g => g.type));
    this.expandedDocTypes.set(set);
  }

  toggleDocType(type: string) {
    const set = new Set(this.expandedDocTypes());
    if (set.has(type)) set.delete(type);
    else set.add(type);
    this.expandedDocTypes.set(set);
  }

  openUploadModal() {
    this.uploadStep.set(1);
    this.uploadFile = null;
    this.uploadName = '';
    this.uploadRef = '';
    this.uploadOcrText = '';
    this.uploadTempKey = '';
    this.ocrError.set('');
    this.saveError.set('');

    const isAdmin = this.authService.isAdmin();
    const responsibilities = this.authService.getRhResponsibilities();
    if (!isAdmin && responsibilities.length > 0) {
      this.docTypes = responsibilities;
      this.uploadType = responsibilities[0];
    } else {
      this.docTypes = [
        'PERSONAL_FILE', 'EMPLOYMENT_CONTRACT', 'PAYSLIP', 'LEAVE_REQUEST',
        'EVALUATION', 'TRAINING', 'ADMINISTRATIVE', 'OTHER'
      ];
      this.uploadType = 'OTHER';
    }

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
      this.uploadOcrText = result.ocrText ?? '';
      this.uploadStep.set(2);
    } catch (e: any) {
      this.ocrError.set(getErrorMessage(e, 'Erreur lors de l\'analyse OCR'));
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
        author: `${this.employee()!.firstName} ${this.employee()!.lastName}`,
        tempKey: this.uploadTempKey,
        ocrText: this.uploadOcrText
      });
      this.showUploadModal.set(false);
      await this.load(this.employee()!.id);
    } catch (e: any) {
      this.saveError.set(getErrorMessage(e, 'Erreur lors de l\'enregistrement'));
    } finally {
      this.saving.set(false);
    }
  }

  openVersionModal(doc: EmployeeDocument) {
    this.versionTargetDoc.set(doc);
    this.versionStep.set(1);
    this.versionFile = null;
    this.versionOcrText = '';
    this.versionTempKey = '';
    this.versionOcrError.set('');
    this.versionSaveError.set('');
    this.showVersionModal.set(true);
  }

  onVersionFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.versionFile = input.files[0];
    }
  }

  async analyzeVersionOcr() {
    const doc = this.versionTargetDoc();
    if (!doc || !this.versionFile) return;
    this.analyzingVersionOcr.set(true);
    this.versionOcrError.set('');
    try {
      const result: OcrPreviewResult = await this.documentService.ocrPreviewVersion(doc.id, this.versionFile);
      this.versionTempKey = result.tempKey;
      this.versionOcrText = result.ocrText ?? '';
      this.versionStep.set(2);
    } catch (e: any) {
      this.versionOcrError.set(getErrorMessage(e, 'Erreur lors de l\'analyse OCR'));
    } finally {
      this.analyzingVersionOcr.set(false);
    }
  }

  async saveVersion() {
    const doc = this.versionTargetDoc();
    if (!doc || !this.versionTempKey) return;
    this.savingVersion.set(true);
    this.versionSaveError.set('');
    try {
      const emp = this.employee();
      const name = emp ? `${emp.firstName} ${emp.lastName}` : 'inconnu';
      await this.documentService.saveVersionFromPreview(doc.id, name, this.versionTempKey, this.versionOcrText);
      this.showVersionModal.set(false);
      await this.load(this.employee()!.id);
    } catch (e: any) {
      this.versionSaveError.set(getErrorMessage(e, 'Erreur lors de l\'enregistrement de la version'));
    } finally {
      this.savingVersion.set(false);
    }
  }

  async download(doc: EmployeeDocument) {
    await this.documentService.download(doc.id, doc.name);
  }

  async openDoc(doc: EmployeeDocument) {
    await this.documentService.open(doc.id, doc.name);
  }

  async openVersions(doc: EmployeeDocument) {
    this.selectedDoc.set(doc);
    try {
      const v = await this.documentService.listVersions(doc.id);
      this.versions.set(v);
      this.showVersionsModal.set(true);
    } catch (e: any) {
      console.error('Failed to load versions', e);
      alert('Impossible de charger les versions. Vérifiez votre connexion ou réessayez.');
    }
  }

  async openVersion(v: any) {
    await this.documentService.openVersion(v.id, `v${v.versionNumber}_${this.selectedDoc()?.name}`);
  }

  async downloadVersion(v: any) {
    await this.documentService.downloadVersion(v.id, `v${v.versionNumber}_${this.selectedDoc()?.name}`);
  }

  async deleteDoc(doc: EmployeeDocument) {
    if (!confirm(`Supprimer "${doc.name}" ?`)) return;
    try {
      await this.documentService.delete(doc.id);
      this.documents.set(this.documents().filter(d => d.id !== doc.id));
      await this.load(this.employee()!.id);
    } catch (e: any) {
      alert(getErrorMessage(e, 'Erreur lors de la suppression'));
    }
  }

  onEditClose(saved: boolean) {
    this.showEditForm.set(false);
    if (saved && this.employee()) this.load(this.employee()!.id);
  }
}
