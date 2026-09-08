import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { DocumentService, OcrPreviewResult } from '../../../core/services/document.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { ApiService } from '../../../core/services/api.service';
import { AnnouncementService } from '../../../core/services/announcement.service';
import { EventService, CalendarEvent } from '../../../core/services/event.service';
import { Employee } from '../../../core/models/employee.model';
import { DocumentType } from '../../../core/models/user.model';
import { environment } from '../../../../environments/environment';
import { getErrorMessage } from '../../../core/utils/error.utils';
import { SafeHtmlPipe } from '../../../shared/pipes/safe-html.pipe';
import {
  LucideUpload,
  LucideScanText,
  LucideCheck,
  LucideX,
  LucideSearch,
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronDown,
  LucideUsers,
  LucideFileCheck2,
  LucideBuilding2,
  LucideHardDrive,
  LucideMegaphone,
  LucideFileText,
  LucideUserCog,
  LucideFiles,
  LucideCalendarDays
} from '@lucide/angular';

interface DocumentItem {
  id: string;
  name: string;
  employeeFirstName: string;
  employeeLastName: string;
  employeeMatricule: string;
  employeeHasPhoto: boolean;
  employeeEmail: string;
  employeeId: string;
  type: DocumentType;
  createdAt: Date;
}

interface EmployeeGroup {
  employeeId: string;
  employeeFirstName: string;
  employeeLastName: string;
  employeeMatricule: string;
  employeeHasPhoto: boolean;
  documents: DocumentItem[];
}

interface DistributionItem {
  typeLabel: string;
  count: number;
  percentage: number;
}

@Component({
  selector: 'app-rh-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LucideUpload,
    LucideScanText,
    LucideCheck,
    LucideX,
    LucideSearch,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronDown,
    LucideUsers,
    LucideFileCheck2,
    LucideBuilding2,
    LucideHardDrive,
    LucideMegaphone,
    LucideFileText,
    LucideUserCog,
    LucideFiles,
    LucideCalendarDays,
    SafeHtmlPipe
  ],
  templateUrl: './rh-dashboard.html'
})
export class RhDashboard implements OnInit, AfterViewInit, OnDestroy {
  apiUrl = environment.apiUrl;

  @ViewChild('employesSection') employesSectionEl?: ElementRef<HTMLElement>;
  @ViewChild('recentDocsHeader') recentDocsHeaderEl?: ElementRef<HTMLElement>;
  recentDocsListHeight = signal<number | undefined>(undefined);
  private heightObserver?: ResizeObserver;

  ngAfterViewInit() {
    this.syncRecentDocsHeight();
    if (typeof ResizeObserver !== 'undefined' && this.employesSectionEl?.nativeElement) {
      this.heightObserver = new ResizeObserver(() => this.syncRecentDocsHeight());
      this.heightObserver.observe(this.employesSectionEl.nativeElement);
    }
  }

  ngOnDestroy() {
    this.heightObserver?.disconnect();
  }

  private syncRecentDocsHeight() {
    const target = this.employesSectionEl?.nativeElement;
    const header = this.recentDocsHeaderEl?.nativeElement;
    if (!target) return;
    const headerH = header ? header.offsetHeight : 60;
    const h = target.offsetHeight - headerH - 16;
    if (h > 60) this.recentDocsListHeight.set(Math.round(h));
  }

  // Data signals
  employees = signal<Employee[]>([]);
  responsibilities = signal<DocumentType[]>([]);
  loading = signal(true);

  // Statistics & additional data
  recentDocuments = signal<DocumentItem[]>([]);
  recentDocsLoading = signal(true);
  expandedRecentGroups = signal<Set<string>>(new Set());
  recentGroups = computed(() => {
    const map = new Map<string, EmployeeGroup>();
    for (const doc of this.recentDocuments()) {
      if (!map.has(doc.employeeId)) {
        map.set(doc.employeeId, {
          employeeId: doc.employeeId,
          employeeFirstName: doc.employeeFirstName,
          employeeLastName: doc.employeeLastName,
          employeeMatricule: doc.employeeMatricule,
          employeeHasPhoto: doc.employeeHasPhoto,
          documents: []
        });
      }
      map.get(doc.employeeId)!.documents.push(doc);
    }
    return Array.from(map.values());
  });
  docDistribution = signal<DistributionItem[]>([]);
  distributionLoading = signal(true);
  allDocuments = signal<any[]>([]); // store all docs for client-side stats

  // Employee search
  employeeSearch = signal('');

  // Employee pagination
  employeeCurrentPage = signal(1);
  employeeItemsPerPage = 10;

  // Upload wizard state
  showUpload = signal(false);
  uploadStep = signal<1 | 2>(1);
  selectedEmployee = '';
  uploadFile: File | null = null;
  uploadName = '';
  uploadType: DocumentType = 'OTHER';
  uploadRef = '';
  uploadOcrText = '';
  uploadTempKey = '';
  analyzingOcr = signal(false);
  saving = signal(false);
  ocrError = signal('');
  saveError = signal('');

  // Computed signals – general
  totalEmployees = computed(() => this.employees().filter(e => e.status !== 'TERMINATED').length);

  departmentsCount = computed(() => {
    const depts = new Set(this.employees().map(e => e.department).filter(Boolean));
    return depts.size;
  });

  filteredEmployees = computed(() => {
    const search = this.employeeSearch().toLowerCase().trim();
    if (!search) return this.employees();
    return this.employees().filter(emp =>
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(search) ||
      emp.matricule?.toLowerCase().includes(search)
    );
  });

  // Employee pagination computed
  employeeTotalPages = computed(() => Math.ceil(this.filteredEmployees().length / this.employeeItemsPerPage));

  paginatedEmployeesList = computed(() => {
    const start = (this.employeeCurrentPage() - 1) * this.employeeItemsPerPage;
    const end = start + this.employeeItemsPerPage;
    return this.filteredEmployees().slice(start, end);
  });

  employeeVisiblePages = computed(() => {
    const total = this.employeeTotalPages();
    const current = this.employeeCurrentPage();
    const delta = 2;
    let start = Math.max(1, current - delta);
    let end = Math.min(total, current + delta);
    if (end - start < 4) {
      if (start === 1) end = Math.min(total, start + 4);
      else if (end === total) start = Math.max(1, end - 4);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  // Document stats (computed from allDocuments)
  myDocumentsCount = computed(() => {
    const currentUser = this.authService.profile()?.email;
    return this.allDocuments().filter(d => d.author === currentUser).length;
  });

  // Storage stats
  storageBytes = signal(0);
  storageObjectCount = signal(0);
  announcements = signal<any[]>([]);
  diskTotal = signal(0);
  diskFree = signal(0);
  events = signal<CalendarEvent[]>([]);
  selectedCalendarItem: any = null;

  calendarEvents = computed(() => {
    const now = new Date();
    const events: { title: string; date: Date; startTime: string; priority: string; type: string; raw: any }[] = [];
    for (const ev of this.events()) {
      const d = new Date(ev.eventDate);
      events.push({ title: ev.title, date: d, startTime: ev.startTime || '', priority: ev.priority || 'NORMALE', type: 'event', raw: ev });
    }
    for (const a of this.announcements()) {
      const d = new Date(a.createdAt);
      events.push({ title: a.title, date: d, startTime: '', priority: a.priority, type: 'announcement', raw: a });
    }
    return events
      .filter(e => e.date >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 6);
  });

  get storageUsed(): string { return formatBytes(this.storageBytes()); }
  get storageFree(): string { return formatBytes(this.diskFree()); }
  get storageTotal(): string { return formatBytes(this.diskTotal()); }
  get storagePercentage(): number {
    const total = this.diskTotal();
    if (total === 0) return 0;
    return Math.min(100, +(this.storageBytes() / total * 100).toFixed(1));
  }

  distributionColors = ['#3b82f6', '#8b5cf6', '#22c55e', '#f97316', '#ef4444', '#06b6d4', '#ec4899', '#eab308'];

  get distributionGradient(): string {
    const items = this.docDistribution();
    let acc = 0;
    const segments = items.map((it, i) => {
      const start = acc;
      acc += it.percentage;
      const color = this.distributionColors[i % this.distributionColors.length];
      return `${color} ${start}% ${acc}%`;
    }).join(', ');
    return `conic-gradient(${segments || '#e5e7eb 0% 100%'})`;
  }

  // Helper for template
  Math = Math;

  respColors: Array<{ bg: string; text: string }> = [
    { bg: '#eaf2ff', text: '#2563eb' },
    { bg: '#f2ecff', text: '#8b5cf6' },
    { bg: '#e9f9ef', text: '#16a34a' },
    { bg: '#fff5dd', text: '#f59e0b' },
    { bg: '#fff0f0', text: '#ef4444' },
    { bg: '#e7f8f6', text: '#0d9488' }
  ];

  respIcon(type: string): string {
    switch (type) {
      case 'PERSONAL_FILE': return 'user';
      case 'EMPLOYMENT_CONTRACT': return 'contract';
      case 'PAYSLIP': return 'payslip';
      case 'LEAVE_REQUEST': return 'leave';
      case 'EVALUATION': return 'eval';
      case 'TRAINING': return 'training';
      case 'ADMINISTRATIVE': return 'admin';
      default: return 'file';
    }
  }

  docTypeLabels: Record<string, string> = {
    PERSONAL_FILE: 'Dossier personnel',
    EMPLOYMENT_CONTRACT: 'Contrat de travail',
    PAYSLIP: 'Bulletin de paie',
    LEAVE_REQUEST: 'Demande de congé',
    EVALUATION: 'Évaluation',
    TRAINING: 'Formation',
    ADMINISTRATIVE: 'Administratif',
    OTHER: 'Autre'
  };

  constructor(
    private authService: AuthService,
    private documentService: DocumentService,
    private employeeService: EmployeeService,
    private apiService: ApiService,
    private announcementService: AnnouncementService,
    private eventService: EventService
  ) {}

  async ngOnInit() {
    await this.authService.ready();
    // Load announcements
    try {
      this.announcements.set(await this.announcementService.list());
    } catch (e) {
      console.warn('Announcements not available', e);
    }
    try {
      this.events.set(await this.eventService.upcoming());
    } catch (e) {
      console.warn('Events not available', e);
    }
    this.responsibilities.set(this.authService.getRhResponsibilities());
    if (this.responsibilities().length > 0) {
      this.uploadType = this.responsibilities()[0];
    }

    try {
      const [emps, docs] = await Promise.all([
        this.employeeService.list(),
        this.documentService.search({})
      ]);
      this.employees.set(emps);
      this.allDocuments.set(docs);

      // Recent documents (last 5) — backend now returns employeeFirstName, employeeLastName, employeeMatricule
      const sorted = [...docs].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ).slice(0, 5);

      const recent: DocumentItem[] = sorted.map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        employeeFirstName: doc.employeeFirstName || '',
        employeeLastName: doc.employeeLastName || '',
        employeeMatricule: doc.employeeMatricule || '',
        employeeHasPhoto: doc.employeeHasPhoto || false,
        employeeEmail: doc.employeeEmail || '',
        employeeId: doc.employeeId,
        type: doc.type,
        createdAt: new Date(doc.createdAt)
      }));
      this.recentDocuments.set(recent);
      this.expandAllRecentGroups();

      // Document distribution
      const typeCounts = new Map<string, number>();
      docs.forEach((doc: any) => {
        const type = doc.type;
        typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
      });
      const total = docs.length;
      const distribution = Array.from(typeCounts.entries()).map(([type, count]) => ({
        typeLabel: this.docTypeLabels[type] || type,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }));
      this.docDistribution.set(distribution);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      this.loading.set(false);
      this.recentDocsLoading.set(false);
      this.distributionLoading.set(false);
    }

    await this.refreshStorageStats();
  }

  async refreshStorageStats() {
    try {
      const [stats, disk] = await Promise.all([
        this.apiService.get<{ totalSize: number; objectCount: number }>('/storage/stats'),
        this.apiService.get<{ totalSpace: number; usedSpace: number; freeSpace: number }>('/storage/disk')
      ]);
      this.storageBytes.set(stats.totalSize);
      this.storageObjectCount.set(stats.objectCount);
      this.diskTotal.set(disk.totalSpace);
      this.diskFree.set(disk.freeSpace);
    } catch (e) {
      console.error('Failed to load storage stats', e);
    }
  }

  get userName() {
    const p = this.authService.profile();
    return p ? `${p.firstName} ${p.lastName}` : '';
  }

  get userFirstName(): string {
    const p = this.authService.profile();
    return p?.firstName || (this.userName || 'Utilisateur');
  }

  get userInitial(): string {
    const p = this.authService.profile();
    return (p?.firstName?.charAt(0) || 'U').toUpperCase();
  }

  greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }

  priorityLabel(p: string): string {
    switch (p) {
      case 'CRITIQUE': return 'Critique';
      case 'HAUTE': return 'Haute';
      case 'NORMALE': return 'Normale';
      default: return p || 'Normale';
    }
  }

  announcementEyebrow(p: string): string {
    if (p === 'CRITIQUE') return 'Annonce importante';
    if (p === 'HAUTE') return 'Annonce prioritaire';
    return 'Annonce';
  }

  toggleRecentGroup(employeeId: string) {
    const set = new Set(this.expandedRecentGroups());
    if (set.has(employeeId)) {
      set.delete(employeeId);
    } else {
      set.add(employeeId);
    }
    this.expandedRecentGroups.set(set);
  }

  openCalendarItem(item: any) {
    this.selectedCalendarItem = item;
  }

  expandAllRecentGroups() {
    const set = new Set(this.recentGroups().map(g => g.employeeId));
    this.expandedRecentGroups.set(set);
  }

  async openDocument(doc: any) {
    try {
      await this.documentService.open(doc.id, doc.name);
    } catch (e) {
      console.error('Failed to open document', e);
    }
  }

  // Employee pagination methods
  goToEmployeePage(page: number) {
    if (page < 1 || page > this.employeeTotalPages()) return;
    this.employeeCurrentPage.set(page);
  }

  goToPrevEmployeePage() {
    this.goToEmployeePage(this.employeeCurrentPage() - 1);
  }

  goToNextEmployeePage() {
    this.goToEmployeePage(this.employeeCurrentPage() + 1);
  }

  onEmployeeSearchChange() {
    this.employeeCurrentPage.set(1);
  }

  // Upload methods
  openUpload() {
    this.uploadStep.set(1);
    this.uploadFile = null;
    this.uploadName = '';
    this.uploadRef = '';
    this.uploadOcrText = '';
    this.uploadTempKey = '';
    this.selectedEmployee = '';
    this.ocrError.set('');
    this.saveError.set('');
    if (this.responsibilities().length > 0) this.uploadType = this.responsibilities()[0];
    this.showUpload.set(true);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.uploadFile = input.files[0];
      this.uploadName = this.uploadFile.name.replace(/\.[^.]+$/, '');
    }
  }

  async analyzeOcr() {
    if (!this.uploadFile) return;
    this.analyzingOcr.set(true);
    this.ocrError.set('');
    try {
      const result: OcrPreviewResult = await this.documentService.ocrPreview(this.uploadFile);
      this.uploadTempKey = result.tempKey;
      this.uploadOcrText = result.ocrText;
      this.uploadStep.set(2);
    } catch (e: any) {
      this.ocrError.set(getErrorMessage(e, 'Erreur OCR'));
    } finally {
      this.analyzingOcr.set(false);
    }
  }

  async saveDocument() {
    if (!this.selectedEmployee || !this.uploadTempKey) return;
    this.saving.set(true);
    this.saveError.set('');
    try {
      await this.documentService.saveFromPreview({
        employeeId: this.selectedEmployee,
        documentReference: this.uploadRef || `REF-${Date.now()}`,
        name: this.uploadName,
        type: this.uploadType,
        author: this.authService.profile()?.email ?? '',
        tempKey: this.uploadTempKey,
        ocrText: this.uploadOcrText
      });
      this.showUpload.set(false);
      await this.refreshData();
    } catch (e: any) {
      this.saveError.set(getErrorMessage(e, 'Erreur enregistrement'));
    } finally {
      this.saving.set(false);
    }
  }

  private async refreshData() {
    try {
      const docs = await this.documentService.search({});
      this.allDocuments.set(docs);

      const sorted = [...docs].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ).slice(0, 5);
      const recent: DocumentItem[] = sorted.map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        employeeFirstName: doc.employeeFirstName || '',
        employeeLastName: doc.employeeLastName || '',
        employeeMatricule: doc.employeeMatricule || '',
        employeeHasPhoto: doc.employeeHasPhoto || false,
        employeeEmail: doc.employeeEmail || '',
        employeeId: doc.employeeId,
        type: doc.type,
        createdAt: new Date(doc.createdAt)
      }));
      this.recentDocuments.set(recent);
      this.expandAllRecentGroups();

      const typeCounts = new Map<string, number>();
      docs.forEach((doc: any) => {
        const type = doc.type;
        typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
      });
      const total = docs.length;
      const distribution = Array.from(typeCounts.entries()).map(([type, count]) => ({
        typeLabel: this.docTypeLabels[type] || type,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }));
      this.docDistribution.set(distribution);
    } catch (err) {
      console.error('Refresh failed', err);
    }
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}