import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DocumentService, DocumentStats } from '../../../core/services/document.service';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { EmployeeDocument } from '../../../core/models/document.model';
import {
  LucideSearch, LucideFileText, LucideDownload, LucideLayers, LucideX, LucideEye, LucideChevronDown,
LucideFiles, LucideClock, LucideHardDrive, 
    LucideUsers, LucidePieChart, LucideFolderOpen
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
  selector: 'app-documents-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
LucideSearch, LucideFileText, LucideDownload, LucideLayers, LucideX, LucideEye, LucideChevronDown,
LucideFiles, LucideClock, LucideHardDrive, 
  LucideUsers, LucidePieChart, LucideFolderOpen
  ],
  templateUrl: './documents-list.html'
})
export class DocumentsList implements OnInit {
  apiUrl = environment.apiUrl;
  isManager = false;
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
  storageBytes = signal(0);
  storageObjectCount = signal(0);
  diskTotal = signal(0);
  diskFree = signal(0);

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

  pageSize = 8;
  currentPage = signal(1);

  lastPage = computed(() => Math.max(1, Math.ceil(this.groups().length / this.pageSize)));

  pages = computed(() => {
    const n = this.lastPage();
    return Array.from({ length: n }, (_, i) => i + 1);
  });

  pagedGroups = computed(() => {
    const all = this.groups();
    const page = Math.min(this.currentPage(), this.lastPage());
    const start = (page - 1) * this.pageSize;
    return all.slice(start, start + this.pageSize);
  });

  goToPage(p: number) {
    const page = Math.min(Math.max(1, p), this.lastPage());
    this.currentPage.set(page);
  }

  employeesWithDocs = computed(() => this.groups().length);

  get storageUsed(): string {
    return formatBytes(this.storageBytes());
  }

  get storageFree(): string {
    return formatBytes(this.diskFree());
  }

  get storageTotal(): string {
    return formatBytes(this.diskTotal());
  }

  get storagePercentage(): number {
    const total = this.diskTotal();
    if (total === 0) return 0;
    return Math.min(100, +(this.storageBytes() / total * 100).toFixed(1));
  }

  constructor(
    private documentService: DocumentService,
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    const p = this.authService.profile();
    this.isManager = !!(p && p.roles.includes('MANAGER') && !p.roles.includes('ADMINISTRATOR') && !p.roles.includes('RH'));
    const tasks: Promise<any>[] = [this.search(), this.loadDocsStats()];
    if (!this.isManager) tasks.push(this.loadStorage());
    await Promise.all(tasks);
  }

  async loadDocsStats() {
    try {
      this.docsStats.set(await this.documentService.stats());
    } catch (e) {
      console.error('Failed to load document stats', e);
    }
  }

  async loadStorage() {
    try {
      const [stats, disk] = await Promise.all([
        this.apiService.get<{ totalSize: number; objectCount: number }>('/storage/stats'),
        this.apiService.get<{ totalSpace: number; usedSpace: number; freeSpace: number }>('/storage/disk')
      ]);
      this.storageBytes.set(stats.totalSize);
      this.storageObjectCount.set(stats.objectCount);
      this.diskTotal.set(disk.totalSpace);
      this.diskFree.set(disk.freeSpace);
    } catch (e) {
      console.error('Failed to load storage stats', e);
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
        this.currentPage.set(1);
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

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 o';
  const k = 1024;
  const sizes = ['o', 'Ko', 'Mo', 'Go', 'To'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}