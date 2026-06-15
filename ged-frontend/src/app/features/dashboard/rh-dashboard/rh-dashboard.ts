import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { DocumentService, OcrPreviewResult } from '../../../core/services/document.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { Employee } from '../../../core/models/employee.model';
import { DocumentType } from '../../../core/models/user.model';
import { environment } from '../../../../environments/environment';
import {
  LucideUpload,
  LucideScanText,
  LucideCheck,
  LucideX,
  LucideSearch,
  LucideChevronLeft,
  LucideChevronRight
} from '@lucide/angular';

interface DocumentItem {
  id: string;
  name: string;
  employeeName: string;
  employeeMatricule: string;
  employeeEmail: string;
  employeeId: string;
  type: DocumentType;
  createdAt: Date;
}

interface DistributionItem {
  typeLabel: string;
  count: number;
  percentage: number;
}

@Component({
  selector: 'app-rh-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LucideUpload,
    LucideScanText,
    LucideCheck,
    LucideX,
    LucideSearch,
    LucideChevronLeft,
    LucideChevronRight
  ],
  templateUrl: './rh-dashboard.html'
})
export class RhDashboard implements OnInit {
  apiUrl = environment.apiUrl;

  // Data signals
  employees = signal<Employee[]>([]);
  responsibilities = signal<DocumentType[]>([]);
  loading = signal(true);

  // Statistics & additional data
  recentDocuments = signal<DocumentItem[]>([]);
  recentDocsLoading = signal(true);
  docDistribution = signal<DistributionItem[]>([]);
  distributionLoading = signal(true);
  allDocuments = signal<any[]>([]); // store all docs for client-side stats

  // Employee search
  employeeSearch = signal('');

  // Employee pagination
  employeeCurrentPage = signal(1);
  employeeItemsPerPage = 10;

  // Upload wizard state
  showUpload = signal(false);
  uploadStep = signal<1 | 2>(1);
  selectedEmployee = '';
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

  // Computed signals – general
  totalEmployees = computed(() => this.employees().length);

  departmentsCount = computed(() => {
    const depts = new Set(this.employees().map(e => e.department).filter(Boolean));
    return depts.size;
  });

  filteredEmployees = computed(() => {
    const search = this.employeeSearch().toLowerCase().trim();
    if (!search) return this.employees();
    return this.employees().filter(emp =>
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(search) ||
      emp.matricule?.toLowerCase().includes(search)
    );
  });

  // Employee pagination computed
  employeeTotalPages = computed(() => Math.ceil(this.filteredEmployees().length / this.employeeItemsPerPage));

  paginatedEmployeesList = computed(() => {
    const start = (this.employeeCurrentPage() - 1) * this.employeeItemsPerPage;
    const end = start + this.employeeItemsPerPage;
    return this.filteredEmployees().slice(start, end);
  });

  employeeVisiblePages = computed(() => {
    const total = this.employeeTotalPages();
    const current = this.employeeCurrentPage();
    const delta = 2;
    let start = Math.max(1, current - delta);
    let end = Math.min(total, current + delta);
    if (end - start < 4) {
      if (start === 1) end = Math.min(total, start + 4);
      else if (end === total) start = Math.max(1, end - 4);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  // Document stats (computed from allDocuments)
  myDocumentsCount = computed(() => {
    const currentUser = this.authService.profile()?.email;
    return this.allDocuments().filter(d => d.author === currentUser).length;
  });

  // Helper for template
  Math = Math;

  docTypeLabels: Record<string, string> = {
    PERSONAL_FILE: 'Dossier personnel',
    EMPLOYMENT_CONTRACT: 'Contrat de travail',
    PAYSLIP: 'Bulletin de paie',
    LEAVE_REQUEST: 'Demande de congé',
    EVALUATION: 'Évaluation',
    TRAINING: 'Formation',
    ADMINISTRATIVE: 'Administratif',
    OTHER: 'Autre'
  };

  constructor(
    private authService: AuthService,
    private documentService: DocumentService,
    private employeeService: EmployeeService
  ) {}

  async ngOnInit() {
    this.responsibilities.set(this.authService.getRhResponsibilities());
    if (this.responsibilities().length > 0) {
      this.uploadType = this.responsibilities()[0];
    }

    try {
      const [emps, docs] = await Promise.all([
        this.employeeService.list(),
        this.documentService.search({})
      ]);
      this.employees.set(emps);
      this.allDocuments.set(docs);

      // Recent documents (last 5)
      const sorted = [...docs].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ).slice(0, 5);

      const recent = await Promise.all(sorted.map(async (doc: any) => {
        let employeeName = '';
        let employeeMatricule = '';
        let employeeEmail = '';
        try {
          const emp = await this.employeeService.get(doc.employeeId);
          if (emp) {
            employeeName = `${emp.firstName} ${emp.lastName}`;
            employeeMatricule = emp.matricule ?? '';
            employeeEmail = emp.email ?? '';
          }
        } catch (e) { /* ignore */ }
        return {
          id: doc.id,
          name: doc.name,
          employeeName,
          employeeMatricule,
          employeeEmail,
          employeeId: doc.employeeId,
          type: doc.type,
          createdAt: new Date(doc.createdAt)
        };
      }));
      this.recentDocuments.set(recent);

      // Document distribution
      const typeCounts = new Map<string, number>();
      docs.forEach((doc: any) => {
        const type = doc.type;
        typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
      });
      const total = docs.length;
      const distribution = Array.from(typeCounts.entries()).map(([type, count]) => ({
        typeLabel: this.docTypeLabels[type] || type,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }));
      this.docDistribution.set(distribution);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      this.loading.set(false);
      this.recentDocsLoading.set(false);
      this.distributionLoading.set(false);
    }
  }

  get userName() {
    const p = this.authService.profile();
    return p ? `${p.firstName} ${p.lastName}` : '';
  }

  // Employee pagination methods
  goToEmployeePage(page: number) {
    if (page < 1 || page > this.employeeTotalPages()) return;
    this.employeeCurrentPage.set(page);
  }

  goToPrevEmployeePage() {
    this.goToEmployeePage(this.employeeCurrentPage() - 1);
  }

  goToNextEmployeePage() {
    this.goToEmployeePage(this.employeeCurrentPage() + 1);
  }

  onEmployeeSearchChange() {
    this.employeeCurrentPage.set(1);
  }

  // Upload methods
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
      await this.refreshData();
    } catch (e: any) {
      this.saveError.set(e?.error?.message ?? 'Erreur enregistrement');
    } finally {
      this.saving.set(false);
    }
  }

  private async refreshData() {
    try {
      const docs = await this.documentService.search({});
      this.allDocuments.set(docs);

      const sorted = [...docs].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ).slice(0, 5);
      const recent = await Promise.all(sorted.map(async (doc: any) => {
        let employeeName = '';
        let employeeMatricule = '';
        let employeeEmail = '';
        try {
          const emp = await this.employeeService.get(doc.employeeId);
          if (emp) {
            employeeName = `${emp.firstName} ${emp.lastName}`;
            employeeMatricule = emp.matricule ?? '';
            employeeEmail = emp.email ?? '';
          }
        } catch (e) { /* ignore */ }
        return {
          id: doc.id,
          name: doc.name,
          employeeName,
          employeeMatricule,
          employeeEmail,
          employeeId: doc.employeeId,
          type: doc.type,
          createdAt: new Date(doc.createdAt)
        };
      }));
      this.recentDocuments.set(recent);

      const typeCounts = new Map<string, number>();
      docs.forEach((doc: any) => {
        const type = doc.type;
        typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
      });
      const total = docs.length;
      const distribution = Array.from(typeCounts.entries()).map(([type, count]) => ({
        typeLabel: this.docTypeLabels[type] || type,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }));
      this.docDistribution.set(distribution);
    } catch (err) {
      console.error('Refresh failed', err);
    }
  }
}