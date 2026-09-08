import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EventService, CalendarEvent, EventPriority } from '../../core/services/event.service';
import { UiService } from '../../core/services/ui.service';
import { LucidePlus, LucideTrash2, LucideX, LucidePencil, LucideChevronLeft, LucideChevronRight, LucideCalendarDays } from '@lucide/angular';
import { getErrorMessage } from '../../core/utils/error.utils';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucidePlus, LucideTrash2, LucideX, LucidePencil, LucideChevronLeft, LucideChevronRight, LucideCalendarDays],
  templateUrl: './calendar.html'
})
export class CalendarComponent implements OnInit {
  events = signal<CalendarEvent[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editingEvent = signal<CalendarEvent | null>(null);
  saving = signal(false);
  formError = signal('');

  cursor = new Date();
  selectedDate = new Date();

  form: { title: string; description: string; eventDate: string; startTime: string; priority: EventPriority } =
    { title: '', description: '', eventDate: this.toDateInput(new Date()), startTime: '', priority: 'NORMALE' };

  priorityOptions: EventPriority[] = ['NORMALE', 'MOYENNE', 'HAUTE', 'CRITIQUE'];
  priorityLabels: Record<EventPriority, string> = { NORMALE: 'Normale', MOYENNE: 'Moyenne', HAUTE: 'Haute', CRITIQUE: 'Critique' };
  priorityDot: Record<EventPriority, string> = {
    NORMALE: 'bg-gray-400',
    MOYENNE: 'bg-blue-500',
    HAUTE: 'bg-orange-500',
    CRITIQUE: 'bg-red-500'
  };

  weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  constructor(private eventService: EventService, private ui: UiService) {}

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading.set(true);
    try {
      this.events.set(await this.eventService.list());
    } finally {
      this.loading.set(false);
    }
  }

  get monthLabel(): string {
    return this.cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  get monthCells(): (Date | null)[] {
    const year = this.cursor.getFullYear();
    const month = this.cursor.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    const remainder = cells.length % 7;
    if (remainder !== 0) for (let i = 0; i < 7 - remainder; i++) cells.push(null);
    return cells;
  }

  isToday(d: Date): boolean {
    const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  }

  isSelected(d: Date): boolean {
    return d.getFullYear() === this.selectedDate.getFullYear() && d.getMonth() === this.selectedDate.getMonth() && d.getDate() === this.selectedDate.getDate();
  }

  eventsForDay(d: Date): CalendarEvent[] {
    const key = this.toDateInput(d);
    return this.events().filter(e => this.toDateInput(new Date(e.eventDate)) === key);
  }

  get selectedDayEvents(): CalendarEvent[] {
    return this.eventsForDay(this.selectedDate);
  }

  selectDay(d: Date) {
    this.selectedDate = d;
  }

  prevMonth() {
    this.cursor = new Date(this.cursor.getFullYear(), this.cursor.getMonth() - 1, 1);
  }

  nextMonth() {
    this.cursor = new Date(this.cursor.getFullYear(), this.cursor.getMonth() + 1, 1);
  }

  openCreateFor(date?: Date) {
    const day = date || this.selectedDate;
    this.editingEvent.set(null);
    this.form = { title: '', description: '', eventDate: this.toDateInput(day), startTime: '', priority: 'NORMALE' };
    this.formError.set('');
    this.showForm.set(true);
  }

  openEdit(e: CalendarEvent) {
    this.editingEvent.set(e);
    this.form = {
      title: e.title,
      description: e.description || '',
      eventDate: this.toDateInput(new Date(e.eventDate)),
      startTime: e.startTime ? e.startTime.slice(0, 5) : '',
      priority: e.priority
    };
    this.formError.set('');
    this.showForm.set(true);
  }

  get isEditing() { return this.editingEvent() !== null; }

  async save() {
    if (!this.form.title.trim() || !this.form.eventDate) {
      this.formError.set('Le titre et la date sont obligatoires.');
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    try {
      const editing = this.editingEvent();
      const req = {
        title: this.form.title.trim(),
        description: this.form.description.trim(),
        eventDate: this.form.eventDate,
        startTime: this.form.startTime || undefined,
        priority: this.form.priority
      };
      if (editing) {
        await this.eventService.update(editing.id, req);
      } else {
        await this.eventService.create(req);
      }
      this.showForm.set(false);
      this.selectedDate = new Date(this.form.eventDate);
      await this.load();
    } catch (e: any) {
      this.formError.set(getErrorMessage(e, 'Erreur lors de la sauvegarde'));
    } finally {
      this.saving.set(false);
    }
  }

  async delete(e: CalendarEvent) {
    if (!(await this.ui.confirm({
      title: 'Supprimer l\'événement',
      message: `Voulez-vous vraiment supprimer "${e.title}" ?`,
      danger: true,
      confirmLabel: 'Supprimer'
    }))) return;
    await this.eventService.delete(e.id);
    await this.load();
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  private toDateInput(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}