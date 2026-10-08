import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DocumentService, DocumentStats } from '../../../core/services/document.service';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { EmployeeDocument } from '../../../core/models/document.model';
import {
  buildEmployeeGroups, buildTypeGroups, DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS
} from '../../../shared/document-types';
import { DocumentsGroupedList } from '../../../shared/components/documents-grouped-list/documents-grouped-list';
import {
  LucideSearch, LucideFiles, LucideClock, LucideUsers, LucidePieChart, LucideHardDrive, LucideFolderOpen
} from '@lucide/angular';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-documents-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, DocumentsGroupedList,
    LucideSearch, LucideFiles, LucideClock, LucideUsers, LucidePieChart, LucideHardDrive, LucideFolderOpen
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
  private searchTimeout: any = null;

  docsStats = signal<DocumentStats>({ total: 0, totalSize: 0, thisMonth: 0, employeesWithDocs: 0, byType: {} });
  storageBytes = signal(0);
  storageObjectCount = signal(0);
  diskTotal = signal(0);
  diskFree = signal(0);

  docTypes: string[] = DOCUMENT_TYPES;
  docTypeLabels = DOCUMENT_TYPE_LABELS;

  typeGroups = computed(() => buildTypeGroups(this.docsStats().byType, this.docsStats().total));

  groups = computed(() => buildEmployeeGroups(this.documents()));

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
      } catch (e) {
        console.error('Search failed', e);
        this.documents.set([]);
      } finally {
        this.loading.set(false);
      }
    }, 300);
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