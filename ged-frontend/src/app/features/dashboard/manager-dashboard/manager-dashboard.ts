import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EmployeeService, OrgContextResponse } from '../../../core/services/employee.service';
import { ApiService } from '../../../core/services/api.service';
import { AnnouncementService } from '../../../core/services/announcement.service';
import { DocumentService } from '../../../core/services/document.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { EventService, CalendarEvent } from '../../../core/services/event.service';
import { Employee } from '../../../core/models/employee.model';
import { environment } from '../../../../environments/environment';
import { LucideUsers, LucideFolderOpen, LucideAlertCircle, LucideCheckCircle, LucideXCircle, LucideFileText, LucideChevronDown, LucideChevronRight, LucideGitBranch, LucideMegaphone, LucideCalendarDays, LucideX, LucideLayoutDashboard } from '@lucide/angular';
import { SafeHtmlPipe } from '../../../shared/pipes/safe-html.pipe';
import { buildRecentGroups, buildCalendarEvents } from '../../../shared/analytics';
import {
  documentTypeShortLabel,
  employeeStatusLabel,
  announcementPriorityLabel,
  announcementEyebrow as announcementEyebrowFn,
  formatDateFr
} from '../../../shared/document-types';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideUsers, LucideFolderOpen, LucideAlertCircle, LucideCheckCircle, LucideXCircle, LucideFileText, LucideChevronDown, LucideChevronRight, LucideGitBranch, LucideMegaphone, LucideCalendarDays, LucideX, LucideLayoutDashboard, SafeHtmlPipe],
  templateUrl: './manager-dashboard.html',
  styles: [`
    .org-card { display: flex; align-items: center; gap: 11px; padding: 12px 16px; border-radius: 14px; border: 1px solid #e7ebf1; background: #fff; min-width: 210px; box-shadow: 0 1px 2px rgba(16,24,40,0.03); cursor: pointer; transition: box-shadow .2s ease, border-color .2s ease, transform .2s ease; }
    .org-card:hover { box-shadow: 0 8px 22px rgba(16,24,40,0.08); border-color: #d3dbe8; transform: translateY(-1px); }
    .org-card-self { border-color: #2563eb; background: #f3f8ff; box-shadow: 0 0 0 2px rgba(37,99,235,0.15); }
    .org-card-manager { border-color: #e2e8f0; background: #ffffff; }
    .org-avatar { width: 38px; height: 38px; border-radius: 50%; background: #edf2f9; border: 1px solid #e7ebf1; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
    .org-avatar-self { width: 42px; height: 42px; background: #eaf2ff; border-color: #d3e4ff; }
    .org-initials { font-weight: 600; color: #8a96a9; font-size: 11px; }
    .org-info { min-width: 0; flex: 1; }
    .org-name { font-weight: 600; color: #15213d; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px; }
    .org-position { font-size: 11px; color: #95a1b3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .org-line-down { width: 2px; height: 24px; background: #d7dee8; flex-shrink: 0; }
    .org-line-up { width: 2px; height: 16px; background: #d7dee8; flex-shrink: 0; }
    .org-card-self .org-name { color: #1d4ed8; }
    .org-tag { flex-shrink: 0; font-size: 10px; font-weight: 600; letter-spacing: .02em; padding: 3px 9px; border-radius: 999px; }
    .org-tag-blue { background: #2563eb; color: #fff; }
    .org-tag-light { background: #eaf2ff; color: #2563eb; }
    .org-tag-gray { background: #f1f4f8; color: #7c889a; }
  `]
})
export class ManagerDashboard implements OnInit {
  apiUrl = environment.apiUrl;
  team = signal<Employee[]>([]);
  loading = signal(true);
  orgContext = signal<OrgContextResponse | null>(null);
  orgLoading = signal(true);

  get orgBoss() { return this.orgContext()?.manager ?? null; }

  reclamations = signal<any[]>([]);
  recentDocs = signal<any[]>([]);
  expandedDocGroups = signal<Set<string>>(new Set());
  announcements = signal<any[]>([]);
  events = signal<CalendarEvent[]>([]);
  selectedCalendarItem: any = null;

  calendarEvents = computed(() => buildCalendarEvents(this.events(), this.announcements()));

  teamFiltered = computed(() => {
    const p = this.authService.profile();
    const empId = p?.employeeId;
    return this.team().filter(e => e.id !== empId);
  });

  directTeam = computed<Employee[]>(() => {
    const ctx = this.orgContext();
    const p = this.authService.profile();
    const empId = p?.employeeId;
    if (!ctx) {
      return this.team().filter(e => e.id !== empId);
    }
    const byId = new Map(this.team().map(e => [e.id, e]));
    return ctx.reports
      .map(r => byId.get(r.id))
      .filter((e): e is Employee => !!e && e.id !== empId);
  });

  selfNode = computed(() => {
    const p = this.authService.profile();
    if (!p) return null;
    return {
      id: p.employeeId ?? p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      matricule: p.matricule ?? '',
      position: '',
      department: '',
      photoUrl: p.photoUrl
    };
  });

  pendingReclamations = computed(() => this.reclamations().filter(r => r.status === 'PENDING'));
  approvedReclamations = computed(() => this.reclamations().filter(r => r.status === 'APPROVED'));
  rejectedReclamations = computed(() => this.reclamations().filter(r => r.status === 'REJECTED'));

  recentGroups = computed(() => buildRecentGroups(this.recentDocs()));

  constructor(
    private authService: AuthService,
    private employeeService: EmployeeService,
    private api: ApiService,
    private announcementService: AnnouncementService,
    private documentService: DocumentService,
    private eventService: EventService,
    private webSocketService: WebSocketService
  ) {}

  get userName() {
    const p = this.authService.profile();
    return p ? `${p.firstName} ${p.lastName}` : '';
  }

  async ngOnInit() {
    await this.authService.ready();
    try {
      const [emps, reclas, docs] = await Promise.all([
        this.employeeService.list(),
        this.api.get<any[]>('/reclamations/team'),
        this.documentService.search({})
      ]);
      this.team.set(emps);
      this.reclamations.set(reclas);
      this.recentDocs.set(docs.slice(0, 10));
      this.expandAllDocGroups();
    } finally {
      this.loading.set(false);
    }
    this.loadAnnouncements();
    this.loadEvents();
    this.loadOrgContext();
    this.webSocketService.onReclamationUpdate(() => this.refreshReclamations());
  }

  private async loadEvents() {
    try {
      this.events.set(await this.eventService.upcoming());
    } catch (e) {
      console.warn('Events not available', e);
    }
  }

  openCalendarItem(item: any) {
    this.selectedCalendarItem = item;
  }

  private async loadOrgContext() {
    const profile = this.authService.profile();
    if (!profile?.employeeId) { this.orgLoading.set(false); return; }
    try {
      this.orgContext.set(await this.employeeService.getOrgContext(profile.employeeId));
    } catch (e) {
      console.warn('Failed to load org context', e);
    } finally {
      this.orgLoading.set(false);
    }
  }

  private async loadAnnouncements() {
    try {
      this.announcements.set(await this.announcementService.list());
    } catch (e) {
      console.warn('Announcements not available', e);
    }
  }

  async refreshReclamations() {
    try {
      const reclas = await this.api.get<any[]>('/reclamations/team');
      this.reclamations.set(reclas);
    } catch (e) {
      console.error('Failed to refresh reclamations', e);
    }
  }

  toggleDocGroup(employeeId: string) {
    const set = new Set(this.expandedDocGroups());
    if (set.has(employeeId)) set.delete(employeeId);
    else set.add(employeeId);
    this.expandedDocGroups.set(set);
  }

  expandAllDocGroups() {
    const set = new Set(this.recentGroups().map(g => g.employeeId));
    this.expandedDocGroups.set(set);
  }

  async openDocument(doc: any) {
    try {
      await this.documentService.open(doc.id, doc.name);
    } catch (e) {
      console.error('Failed to open document', e);
    }
  }

  statusLabel(s: string) {
    return employeeStatusLabel(s);
  }

  reclamationStatusLabel(s: string) {
    const m: Record<string, string> = { PENDING: 'En attente', APPROVED: 'Approuvée', REJECTED: 'Rejetée' };
    return m[s] ?? s;
  }

  priorityLabel(p: string) {
    return announcementPriorityLabel(p);
  }

  announcementEyebrow(p: string): string {
    return announcementEyebrowFn(p);
  }

  documentTypeLabel(type: string): string {
    return documentTypeShortLabel(type);
  }

  formatDate(d: string) {
    return formatDateFr(d);
  }
}
