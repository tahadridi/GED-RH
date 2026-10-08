import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentService } from '../../../core/services/document.service';
import { EmployeeDocument } from '../../../core/models/document.model';
import { DOCUMENT_TYPE_LABELS, EmployeeGroup } from '../../document-types';
import { DocumentsVersionsModal } from '../documents-versions-modal/documents-versions-modal';
import {
  LucideChevronDown, LucideFileText, LucideLayers, LucideDownload
} from '@lucide/angular';

@Component({
  selector: 'app-documents-grouped-list',
  standalone: true,
  imports: [
    CommonModule, DocumentsVersionsModal,
    LucideChevronDown, LucideFileText, LucideLayers, LucideDownload
  ],
  templateUrl: './documents-grouped-list.html'
})
export class DocumentsGroupedList {
  @Input() apiUrl = '';
  @Input() groups: EmployeeGroup[] = [];
  @Input() docTypeLabels: Record<string, string> = DOCUMENT_TYPE_LABELS;

  expanded = signal<Set<string>>(new Set());
  selectedDoc = signal<EmployeeDocument | null>(null);
  versions = signal<any[]>([]);
  showVersions = signal(false);

  constructor(private documentService: DocumentService) {}

  toggleGroup(id: string) {
    const s = new Set(this.expanded());
    if (s.has(id)) s.delete(id); else s.add(id);
    this.expanded.set(s);
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
}