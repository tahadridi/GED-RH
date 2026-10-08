import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentService } from '../../../core/services/document.service';
import { EmployeeDocument } from '../../../core/models/document.model';
import { LucideLayers, LucideX, LucideEye, LucideDownload } from '@lucide/angular';

@Component({
  selector: 'app-documents-versions-modal',
  standalone: true,
  imports: [CommonModule, LucideLayers, LucideX, LucideEye, LucideDownload],
  templateUrl: './documents-versions-modal.html'
})
export class DocumentsVersionsModal {
  @Input() show = false;
  @Input() doc: EmployeeDocument | null = null;
  @Input() versions: any[] = [];
  @Output() close = new EventEmitter<void>();

  constructor(private documentService: DocumentService) {}

  async open(v: any) {
    await this.documentService.openVersion(v.id, `v${v.versionNumber}_${this.doc?.name}`);
  }

  async download(v: any) {
    await this.documentService.downloadVersion(v.id, `v${v.versionNumber}_${this.doc?.name}`);
  }
}