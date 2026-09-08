import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxEditorComponent, NgxEditorMenuComponent, Editor, Toolbar } from 'ngx-editor';
import { AnnouncementService, Announcement, AnnouncementPriority } from '../../../core/services/announcement.service';
import { AuthService } from '../../../core/services/auth.service';
import { SafeHtmlPipe } from '../../../shared/pipes/safe-html.pipe';
import { LucidePlus, LucideTrash2, LucideMegaphone, LucideX, LucideAlertTriangle, LucideInfo, LucideAlertOctagon, LucidePencil, LucideSearch } from '@lucide/angular';
import { getErrorMessage } from '../../../core/utils/error.utils';

interface ConfirmState {
  message: string;
  onConfirm: () => void;
}

@Component({
  selector: 'app-admin-announcements',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEditorComponent, NgxEditorMenuComponent, LucidePlus, LucideTrash2, LucideMegaphone, LucideX, LucideAlertTriangle, LucideInfo, LucideAlertOctagon, LucidePencil, LucideSearch, SafeHtmlPipe],
  templateUrl: './admin-announcements.html'
})
export class AdminAnnouncements implements OnInit, OnDestroy {
  announcements = signal<Announcement[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editingAnnouncement = signal<Announcement | null>(null);
  saving = signal(false);
  formError = signal('');
  searchQuery = signal('');
  confirmState = signal<ConfirmState | null>(null);

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

  editor: Editor | null = null;

  toolbar: Toolbar = [
    ['bold', 'italic', 'underline', 'strike'],
    ['text_color', 'background_color'],
    ['bullet_list', 'ordered_list'],
    ['align_left', 'align_center', 'align_right'],
    ['link', 'format_clear'],
    ['undo', 'redo']
  ];

  colorPresets = ['#111827', '#15213d', '#6b7280', '#9ca3af', '#2563eb', '#0d9488', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#ffffff'];

  canManage = computed(() => this.authService.isAdmin() || this.authService.isDG());

  isDirectionGenerale(a: Announcement): boolean {
    return a.authorRole === 'DIRECTION_GENERALE';
  }

  filteredAnnouncements = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.announcements();
    return this.announcements().filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.content.replace(/<[^>]*>/g, '').toLowerCase().includes(q) ||
      (a.authorName || '').toLowerCase().includes(q)
    );
  });

  constructor(private announcementService: AnnouncementService, private authService: AuthService) {}

  async ngOnInit() {
    this.editor = new Editor();
    await this.load();
  }

  ngOnDestroy() {
    this.editor?.destroy();
  }

  async load() {
    this.loading.set(true);
    try {
      this.announcements.set(await this.announcementService.list());
    } finally {
      this.loading.set(false);
    }
  }

  clearSearch() {
    this.searchQuery.set('');
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
    if (!this.canManage()) {
      this.formError.set('Seuls l\'administrateur et la direction générale peuvent publier des annonces.');
      return;
    }
    const contentHtml = this.form.content.trim();
    const contentText = contentHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (!this.form.title.trim() || !contentText) {
      this.formError.set('Tous les champs sont obligatoires.');
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    try {
      const editing = this.editingAnnouncement();
      if (editing) {
        await this.announcementService.update(editing.id, { title: this.form.title.trim(), content: contentHtml, priority: this.form.priority });
      } else {
        await this.announcementService.create({ title: this.form.title.trim(), content: contentHtml, priority: this.form.priority });
      }
      this.showForm.set(false);
      await this.load();
    } catch (e: any) {
      this.formError.set(getErrorMessage(e, 'Erreur lors de la sauvegarde'));
    } finally {
      this.saving.set(false);
    }
  }

  askDelete(a: Announcement) {
    this.confirmState.set({
      message: `Supprimer l'annonce « ${a.title} » ?`,
      onConfirm: async () => {
        await this.announcementService.delete(a.id);
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

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }
}