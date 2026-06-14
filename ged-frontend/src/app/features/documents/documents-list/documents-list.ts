import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DocumentService } from '../../../core/services/document.service';
import { EmployeeDocument } from '../../../core/models/document.model';
import { DocumentType } from '../../../core/models/user.model';
import { LucideSearch, LucideFileText, LucideDownload, LucideHistory, LucideX, LucideEye } from '@lucide/angular';

@Component({
  selector: 'app-documents-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideSearch, LucideFileText, LucideDownload, LucideHistory, LucideX, LucideEye],
  templateUrl: './documents-list.html'
})
export class DocumentsList implements OnInit {
  documents = signal<EmployeeDocument[]>([]);
  loading = signal(false);
  searchQuery = '';
  selectedType: DocumentType | '' = '';
  selectedDoc = signal<EmployeeDocument | null>(null);
  versions = signal<any[]>([]);
  showVersions = signal(false);
  private searchTimeout: any = null;

  docTypes: DocumentType[] = [
    'PERSONAL_FILE','EMPLOYMENT_CONTRACT','PAYSLIP','LEAVE_REQUEST',
    'EVALUATION','TRAINING','ADMINISTRATIVE','DISCIPLINARY','OTHER'
  ];
  docTypeLabels: Record<string, string> = {
    PERSONAL_FILE: 'Dossier personnel', EMPLOYMENT_CONTRACT: 'Contrat de travail',
    PAYSLIP: 'Bulletin de paie', LEAVE_REQUEST: 'Demande de congé',
    EVALUATION: 'Évaluation', TRAINING: 'Formation',
    ADMINISTRATIVE: 'Administratif', DISCIPLINARY: 'Document disciplinaire', OTHER: 'Autre'
  };

  constructor(private documentService: DocumentService) {}

  async ngOnInit() {
    await this.search();
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
      } finally {
        this.loading.set(false);
      }
    }, 300);
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
