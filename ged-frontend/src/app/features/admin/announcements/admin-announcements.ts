import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnnouncementService, Announcement, AnnouncementPriority } from '../../../core/services/announcement.service';
import { LucidePlus, LucideTrash2, LucideMegaphone, LucideX, LucideAlertTriangle, LucideInfo, LucideAlertOctagon, LucidePencil } from '@lucide/angular';

@Component({
  selector: 'app-admin-announcements',
  standalone: true,
  imports: [CommonModule, FormsModule, LucidePlus, LucideTrash2, LucideMegaphone, LucideX, LucideAlertTriangle, LucideInfo, LucideAlertOctagon, LucidePencil],
  templateUrl: './admin-announcements.html'
})
export class AdminAnnouncements implements OnInit {
  announcements = signal<Announcement[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editingAnnouncement = signal<Announcement | null>(null);
  saving = signal(false);
  formError = signal('');

  form: { title: string; content: string; priority: AnnouncementPriority } = { title: '', content: '', priority: 'NORMALE' };

  priorityOptions: AnnouncementPriority[] = ['NORMALE', 'HAUTE', 'CRITIQUE'];
  priorityLabels: Record<AnnouncementPriority, string> = { NORMALE: 'Normale', HAUTE: 'Haute', CRITIQUE: 'Critique' };
  priorityColors: Record<AnnouncementPriority, string> = {
    NORMALE: 'bg-gray-100 text-gray-700',
    HAUTE: 'bg-orange-100 text-orange-700',
    CRITIQUE: 'bg-red-100 text-red-700'
  };
  priorityBorderColors: Record<AnnouncementPriority, string> = {
    NORMALE: 'border-l-gray-400',
    HAUTE: 'border-l-orange-500',
    CRITIQUE: 'border-l-red-500'
  };
  priorityIcons: Record<AnnouncementPriority, string> = {
    NORMALE: 'info',
    HAUTE: 'alert-triangle',
    CRITIQUE: 'alert-octagon'
  };

  constructor(private announcementService: AnnouncementService) {}

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading.set(true);
    try {
      this.announcements.set(await this.announcementService.list());
    } finally {
      this.loading.set(false);
    }
  }

  openCreate() {
    this.editingAnnouncement.set(null);
    this.form = { title: '', content: '', priority: 'NORMALE' };
    this.formError.set('');
    this.showForm.set(true);
  }

  openEdit(a: Announcement) {
    this.editingAnnouncement.set(a);
    this.form = { title: a.title, content: a.content, priority: a.priority };
    this.formError.set('');
    this.showForm.set(true);
  }

  get isEditing() { return this.editingAnnouncement() !== null; }

  async save() {
    if (!this.form.title.trim() || !this.form.content.trim()) {
      this.formError.set('Tous les champs sont obligatoires.');
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    try {
      const editing = this.editingAnnouncement();
      if (editing) {
        await this.announcementService.update(editing.id, { title: this.form.title.trim(), content: this.form.content.trim(), priority: this.form.priority });
      } else {
        await this.announcementService.create({ title: this.form.title.trim(), content: this.form.content.trim(), priority: this.form.priority });
      }
      this.showForm.set(false);
      await this.load();
    } catch (e: any) {
      this.formError.set(e?.error?.message ?? 'Erreur lors de la sauvegarde');
    } finally {
      this.saving.set(false);
    }
  }

  async delete(a: Announcement) {
    if (!confirm(`Supprimer l'annonce "${a.title}" ?`)) return;
    await this.announcementService.delete(a.id);
    await this.load();
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }
}
