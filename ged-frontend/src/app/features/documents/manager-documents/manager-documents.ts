import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DocumentService, DocumentStats } from '../../../core/services/document.service';
import { EmployeeDocument } from '../../../core/models/document.model';
import {
  buildEmployeeGroups, buildTypeGroups, DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS
} from '../../../shared/document-types';
import { DocumentsGroupedList } from '../../../shared/components/documents-grouped-list/documents-grouped-list';
import {
  LucideSearch, LucideFiles, LucideClock, LucideUsers, LucidePieChart
} from '@lucide/angular';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-manager-documents',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, DocumentsGroupedList,
    LucideSearch, LucideFiles, LucideClock, LucideUsers, LucidePieChart
  ],
  templateUrl: './manager-documents.html'
})
export class ManagerDocuments implements OnInit {
  apiUrl = environment.apiUrl;
  documents = signal<EmployeeDocument[]>([]);
  loading = signal(false);
  searchQuery = '';
  selectedType = '';
  private searchTimeout: any = null;

  docsStats = signal<DocumentStats>({ total: 0, totalSize: 0, thisMonth: 0, employeesWithDocs: 0, byType: {} });

  docTypes: string[] = DOCUMENT_TYPES;
  docTypeLabels = DOCUMENT_TYPE_LABELS;

  typeGroups = computed(() => buildTypeGroups(this.docsStats().byType, this.docsStats().total));

  groups = computed(() => buildEmployeeGroups(this.documents()));

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