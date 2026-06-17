import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocTypeService, DocType } from '../../../core/services/doc-type.service';
import { LucideTrash2, LucideFileText } from '@lucide/angular';

@Component({
  selector: 'app-admin-doc-types',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideTrash2, LucideFileText],
  templateUrl: './admin-doc-types.html'
})
export class AdminDocTypes implements OnInit {
  docTypes = signal<DocType[]>([]);
  loading = signal(false);

  newName = '';
  newDescription = '';

  constructor(private docTypeService: DocTypeService) {}

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading.set(true);
    try {
      this.docTypes.set(await this.docTypeService.list());
    } finally {
      this.loading.set(false);
    }
  }

  async add() {
    if (!this.newName.trim()) return;
    try {
      await this.docTypeService.create({ name: this.newName.trim(), description: this.newDescription.trim() });
      this.newName = '';
      this.newDescription = '';
      await this.load();
    } catch (e) {
      console.error('Failed to add document type', e);
    }
  }

  async delete(id: string) {
    if (!confirm('Supprimer ce type de document ?')) return;
    await this.docTypeService.delete(id);
    await this.load();
  }
}
