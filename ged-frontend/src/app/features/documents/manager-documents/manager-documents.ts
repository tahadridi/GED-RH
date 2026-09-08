import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DocumentService, DocumentStats } from '../../../core/services/document.service';
import { EmployeeDocument } from '../../../core/models/document.model';
import {
  LucideSearch, LucideFileText, LucideDownload, LucideLayers, LucideX, LucideEye, LucideChevronDown,
  LucideFiles, LucideClock, LucideUsers, LucidePieChart
} from '@lucide/angular';
import { environment } from '../../../../environments/environment';

export interface EmployeeGroup {
  employeeId: string;
  employeeFirstName: string;
  employeeLastName: string;
  employeeMatricule: string;
  employeeHasPhoto: boolean;
  documents: EmployeeDocument[];
}

@Component({
  selector: 'app-manager-documents',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
LucideSearch, LucideFileText, LucideDownload, LucideLayers, LucideX, LucideEye, LucideChevronDown,
    LucideFiles, LucideClock, LucideUsers, LucidePieChart
  ],
  templateUrl: './manager-documents.html'
})
export class ManagerDocuments implements OnInit {
  apiUrl = environment.apiUrl;
  documents = signal<EmployeeDocument[]>([]);
  loading = signal(false);
  searchQuery = '';
  selectedType = '';
  selectedDoc = signal<EmployeeDocument | null>(null);
  versions = signal<any[]>([]);
  showVersions = signal(false);
  expandedGroups = signal<Set<string>>(new Set());
  private searchTimeout: any = null;

  docsStats = signal<DocumentStats>({ total: 0, totalSize: 0, thisMonth: 0, employeesWithDocs: 0, byType: {} });

  docTypes: string[] = [
    'PERSONAL_FILE', 'EMPLOYMENT_CONTRACT', 'PAYSLIP', 'LEAVE_REQUEST',
    'EVALUATION', 'TRAINING', 'ADMINISTRATIVE', 'DISCIPLINARY', 'OTHER'
  ];
  docTypeLabels: Record<string, string> = {
    PERSONAL_FILE: 'Dossier personnel', EMPLOYMENT_CONTRACT: 'Contrat de travail',
    PAYSLIP: 'Bulletin de paie', LEAVE_REQUEST: 'Demande de congé',
    EVALUATION: 'Évaluation', TRAINING: 'Formation',
    ADMINISTRATIVE: 'Administratif', DISCIPLINARY: 'Document disciplinaire', OTHER: 'Autre'
  };

  typeGroups = computed(() => {
    const byType = this.docsStats().byType;
    const total = this.docsStats().total || 1;
    return this.docTypes
      .map(t => ({ type: t, label: this.docTypeLabels[t], count: byType[t] ?? 0, pct: Math.round(((byType[t] ?? 0) / total) * 100) }))
      .filter(g => g.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  });

  groups = computed<EmployeeGroup[]>(() => {
    const map = new Map<string, EmployeeGroup>();
    for (const doc of this.documents()) {
      const key = doc.employeeId;
      if (!map.has(key)) {
        map.set(key, {
          employeeId: doc.employeeId,
          employeeFirstName: doc.employeeFirstName,
          employeeLastName: doc.employeeLastName,
          employeeMatricule: doc.employeeMatricule,
          employeeHasPhoto: doc.employeeHasPhoto,
          documents: []
        });
      }
      map.get(key)!.documents.push(doc);
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.employeeLastName + a.employeeFirstName).localeCompare(b.employeeLastName + b.employeeFirstName)
    );
  });

  employeesWithDocs = computed(() => this.groups().length);

  constructor(private documentService: DocumentService) {}

  async ngOnInit() {
    await Promise.all([this.search(), this.loadDocsStats()]);
  }

  async loadDocsStats() {
    try {
      const all = await this.documentService.search({});
      const byType: Record<string, number> = {};
      const now = new Date();
      let thisMonth = 0;
      for (const d of all) {
        byType[d.type] = (byType[d.type] ?? 0) + 1;
        const created = new Date(d.createdAt);
        if (created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth()) thisMonth++;
      }
      this.docsStats.set({
        total: all.length,
        totalSize: 0,
        thisMonth,
        employeesWithDocs: new Set(all.map(d => d.employeeId)).size,
        byType
      });
    } catch (e) {
      console.error('Failed to load document stats', e);
    }
  }

  async search() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(async () => {
      this.loading.set(true);
      try {
        const params: any = {};
        if (this.searchQuery) params.q = this.searchQuery;
        if (this.selectedType) params.type = this.selectedType;
        const docs = await this.documentService.search(params);
        this.documents.set(docs);
        this.expandedGroups.set(new Set(docs.map(d => d.employeeId)));
      } catch (e) {
        console.error('Search failed', e);
        this.documents.set([]);
      } finally {
        this.loading.set(false);
      }
    }, 300);
  }

  toggleGroup(id: string) {
    const s = new Set(this.expandedGroups());
    if (s.has(id)) s.delete(id); else s.add(id);
    this.expandedGroups.set(s);
  }

  async download(doc: EmployeeDocument) {
    await this.documentService.download(doc.id, doc.name);
  }

  async openVersions(doc: EmployeeDocument) {
    this.selectedDoc.set(doc);
    const v = await this.documentService.listVersions(doc.id);
    this.versions.set(v);
    this.showVersions.set(true);
  }

  async openVersion(v: any) {
    await this.documentService.openVersion(v.id, `v${v.versionNumber}_${this.selectedDoc()?.name}`);
  }

  async downloadVersion(v: any) {
    await this.documentService.downloadVersion(v.id, `v${v.versionNumber}_${this.selectedDoc()?.name}`);
  }

  clear() {
    this.searchQuery = '';
    this.selectedType = '';
    this.search();
  }
}