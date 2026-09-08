import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocTypeService, DocType } from '../../../core/services/doc-type.service';
import { LucideTrash2, LucideFileText, LucidePlus, LucideSearch, LucideX, LucideAlertTriangle, LucideFiles } from '@lucide/angular';

interface ConfirmState {
  message: string;
  onConfirm: () => void;
}

@Component({
  selector: 'app-admin-doc-types',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideTrash2, LucideFileText, LucidePlus, LucideSearch, LucideX, LucideAlertTriangle, LucideFiles],
  templateUrl: './admin-doc-types.html'
})
export class AdminDocTypes implements OnInit {
  docTypes = signal<DocType[]>([]);
  loading = signal(false);

  newName = '';
  newDescription = '';

  searchQuery = signal('');

  confirmState = signal<ConfirmState | null>(null);

  filteredTypes = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.docTypes();
    return this.docTypes().filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q)
    );
  });

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

  clearSearch() {
    this.searchQuery.set('');
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

  askDelete(id: string, name: string) {
    this.confirmState.set({
      message: `Supprimer le type de document « ${name} » ?`,
      onConfirm: async () => {
        await this.docTypeService.delete(id);
        await this.load();
      }
    });
  }

  closeConfirm() {
    this.confirmState.set(null);
  }

  async confirmAction() {
    const state = this.confirmState();
    if (!state) return;
    this.closeConfirm();
    await state.onConfirm();
  }
}