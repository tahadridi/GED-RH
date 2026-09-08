import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EmployeeService } from '../../../core/services/employee.service';
import { DocumentService, OcrPreviewResult } from '../../../core/services/document.service';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { AnnouncementService } from '../../../core/services/announcement.service';
import { EventService, CalendarEvent } from '../../../core/services/event.service';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { getErrorMessage } from '../../../core/utils/error.utils';
import { SafeHtmlPipe } from '../../../shared/pipes/safe-html.pipe';
import {
  LucideUsers, LucideFiles, LucideMegaphone, LucideFileCheck2,
  LucideHardDrive, LucideCalendarDays,
  LucideChevronDown,
  LucideBuilding2, LucideFileText, LucideX, LucideLayoutDashboard,
  LucideUpload, LucideScanText, LucideCheck
} from '@lucide/angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule,
    LucideUsers, LucideFiles, LucideMegaphone, LucideFileCheck2,
    LucideHardDrive, LucideCalendarDays,
    LucideChevronDown,
    LucideBuilding2, LucideFileText, LucideX, LucideLayoutDashboard,
    LucideUpload, LucideScanText, LucideCheck,
    SafeHtmlPipe
  ],
  templateUrl: './dashboard.html',
  styles: ``
})
export class Dashboard implements OnInit {
  apiUrl = environment.apiUrl;
  // Signals
  totalEmployees = signal(0);
  totalDocuments = signal(0);
  recentDocuments = signal<any[]>([]);
  allEmployees = signal<any[]>([]);
  allDocuments = signal<any[]>([]);
  loading = signal(true);
  expandedRecentGroups = signal<Set<string>>(new Set());
  storageBytes = signal(0);
  storageObjectCount = signal(0);
  diskTotal = signal(0);
  diskFree = signal(0);
  reclamations = signal<any[]>([]);
  loadingReclamations = signal(false);
  announcements = signal<any[]>([]);
  events = signal<CalendarEvent[]>([]);

  // Upload state
  showUpload = signal(false);
  uploadStep = signal<1 | 2>(1);
  selectedEmployee = '';
  uploadFile: File | null = null;
  uploadName = '';
  uploadType = 'EMPLOYMENT_CONTRACT';
  uploadRef = '';
  uploadOcrText = '';
  uploadTempKey = '';
  analyzingOcr = signal(false);
  saving = signal(false);
  ocrError = signal('');
  saveError = signal('');
  uploadDocTypes = [
    'EMPLOYMENT_CONTRACT', 'PAYSLIP', 'LEAVE_REQUEST', 'EVALUATION',
    'TRAINING', 'ADMINISTRATIVE', 'PERSONAL_FILE', 'INVOICE', 'CONTRACT', 'OTHER'
  ];

  pendingReclamations = computed(() => this.reclamations().filter(r => r.status === 'PENDING'));
  recentPendingReclamations = computed(() => this.pendingReclamations().slice(0, 3));

  departmentsCount = computed(() => {
    const depts = new Set(this.allEmployees().map(e => e.department).filter(Boolean));
    return depts.size;
  });

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

  selectedCalendarItem: any = null;

  distributionColors = ['#3b82f6', '#8b5cf6', '#22c55e', '#f97316', '#ef4444', '#06b6d4', '#ec4899', '#eab308'];

  get distributionGradient(): string {
    const items = this.documentDistribution();
    let acc = 0;
    const segments = items.map((it, i) => {
      const start = acc;
      acc += it.percentage;
      const color = this.distributionColors[i % this.distributionColors.length];
      return `${color} ${start}% ${acc}%`;
    }).join(', ');
    return `conic-gradient(${segments || '#e5e7eb 0% 100%'})`;
  }

  get userFirstName(): string {
    return (this.authService.profile()?.firstName as string) || this.userEmail.split('@')[0] || 'Utilisateur';
  }

  get roleLabel(): string {
    const roles = (this.authService.profile()?.roles as string[]) || [];
    if (roles.includes('ADMINISTRATOR')) return 'Administrateur';
    if (roles.includes('DIRECTION_GENERALE')) return 'Direction Générale';
    if (roles.includes('MANAGER')) return 'Manager';
    if (roles.includes('RH')) return 'Ressources Humaines';
    return 'Utilisateur';
  }

  recentGroups = computed(() => {
    const map = new Map<string, { employeeId: string; employeeFirstName: string; employeeLastName: string; employeeMatricule: string; employeeHasPhoto: boolean; documents: any[] }>();
    for (const doc of this.recentDocuments()) {
      const key = doc.employeeId || 'unknown';
      if (!map.has(key)) {
        map.set(key, {
          employeeId: key,
          employeeFirstName: doc.employeeFirstName || '',
          employeeLastName: doc.employeeLastName || '',
          employeeMatricule: doc.employeeMatricule || '',
          employeeHasPhoto: doc.employeeHasPhoto || false,
          documents: []
        });
      }
      map.get(key)!.documents.push(doc);
    }
    return Array.from(map.values());
  });

  constructor(
    private employeeService: EmployeeService,
    private documentService: DocumentService,
    private authService: AuthService,
    private apiService: ApiService,
    private announcementService: AnnouncementService,
    private eventService: EventService,
    private router: Router
  ) {}

  get userEmail() { return this.authService.user()?.email ?? ''; }
  get userInitial() { return this.userEmail.charAt(0).toUpperCase(); }

  // Greeting method
  greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }

  // Computed values
  newEmployeesThisMonth(): number {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return this.allEmployees().filter(emp => {
      if (!emp.hireDate) return false;
      const d = new Date(emp.hireDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
  }

  documentsThisMonth(): number {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return this.allDocuments().filter(doc => {
      const docDate = new Date(doc.createdAt);
      return docDate.getMonth() === currentMonth && docDate.getFullYear() === currentYear;
    }).length;
  }

  pendingDocuments(): number {
    return this.allDocuments().filter(doc => doc.status === 'PENDING' || doc.status === 'en attente').length;
  }

  recentEmployees() {
    return this.allEmployees()
      .filter(emp => emp.hireDate)
      .sort((a, b) => {
        const dateA = new Date(a.hireDate);
        const dateB = new Date(b.hireDate);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 3);
  }

  documentDistribution() {
    const counts = new Map<string, number>();
    for (const doc of this.allDocuments()) {
      const type = doc.type;
      counts.set(type, (counts.get(type) || 0) + 1);
    }
    const total = this.allDocuments().length;
    return Array.from(counts.entries()).map(([type, count]) => ({
      name: this.documentTypeLabel(type),
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }));
  }

  docsByMonth = computed(() => this.monthSeries(this.allDocuments(), 12, (d: any) => d.createdAt));

  docSizeTotal = computed(() => this.allDocuments().reduce((s, d) => s + (d.fileSize || 0), 0));

  storageByDepartment = computed(() => {
    const empIdToDept = new Map<string, string>();
    for (const e of this.allEmployees()) empIdToDept.set(e.id, e.department || 'Sans département');
    const deptSize = new Map<string, number>();
    for (const d of this.allDocuments()) {
      const dept = empIdToDept.get(d.employeeId) || 'Sans département';
      deptSize.set(dept, (deptSize.get(dept) || 0) + (d.fileSize || 0));
    }
    const total = this.docSizeTotal() || 1;
    return Array.from(deptSize.entries())
      .map(([name, sizeBytes]) => ({ name, sizeBytes, sizeLabel: this.formatFileSize(sizeBytes), pct: (sizeBytes / total) * 100 }))
      .sort((a, b) => b.sizeBytes - a.sizeBytes);
  });

  docsPerEmployee = computed(() => {
    const total = this.allEmployees().length || 1;
    return this.allDocuments().length / total;
  });

  employeesWithoutDoc = computed(() => {
    const ids = new Set(this.allDocuments().map(d => d.employeeId));
    return this.allEmployees().filter(e => !ids.has(e.id)).length;
  });

  docsThisMonthByDepartment = computed(() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    const empIdToDept = new Map<string, string>();
    for (const e of this.allEmployees()) empIdToDept.set(e.id, e.department || 'Sans département');
    const counts = new Map<string, number>();
    for (const d of this.allDocuments()) {
      const dt = new Date(d.createdAt);
      if (dt.getMonth() !== m || dt.getFullYear() !== y) continue;
      const dept = empIdToDept.get(d.employeeId) || 'Sans département';
      counts.set(dept, (counts.get(dept) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  });

  get docStorageUsedLabel(): string {
    return this.formatFileSize(this.docSizeTotal());
  }

  get docStorageOfDiskPct(): number {
    const total = this.diskTotal();
    if (total <= 0) return 0;
    return Math.min(100, +((this.docSizeTotal() / total) * 100).toFixed(1));
  }

  get diskTotalLabel(): string {
    return this.formatFileSize(this.diskTotal());
  }

  private monthSeries<T>(items: T[], months: number, dateOf: (t: T) => string): { month: string; count: number; pct: number; isCurrent: boolean }[] {
    const counts = new Map<string, number>();
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      counts.set(d.toLocaleDateString('fr-FR', { month: 'short' }) + ' ' + String(d.getFullYear()).slice(2), 0);
    }
    for (const it of items) {
      const v = dateOf(it);
      if (!v) continue;
      const d = new Date(v);
      const key = d.toLocaleDateString('fr-FR', { month: 'short' }) + ' ' + String(d.getFullYear()).slice(2);
      if (counts.has(key)) counts.set(key, (counts.get(key) || 0) + 1);
    }
    const max = Math.max(...Array.from(counts.values()), 1);
    const currentKey = now.toLocaleDateString('fr-FR', { month: 'short' }) + ' ' + String(now.getFullYear()).slice(2);
    return Array.from(counts.entries()).map(([month, count]) => ({ month, count, pct: (count / max) * 100, isCurrent: month === currentKey }));
  }

  // Refresh data
  async refreshData() {
    this.loading.set(true);
    try {
      const [employees, docs] = await Promise.all([
        this.employeeService.list(),
        this.documentService.search({})
      ]);
      this.allEmployees.set(employees);
      this.allDocuments.set(docs);
      this.totalEmployees.set(employees.filter(e => e.status === 'ACTIVE').length);
      this.totalDocuments.set(docs.length);
      this.recentDocuments.set(docs.slice(0, 10));
      this.expandAllRecentGroups();
    } catch (e) {
      console.error('Refresh failed', e);
    } finally {
      this.loading.set(false);
    }
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

  get storageUsed(): string {
    return formatBytes(this.storageBytes());
  }

  get storageFree(): string {
    return formatBytes(this.diskFree());
  }

  get storageTotal(): string {
    return formatBytes(this.diskTotal());
  }

  get storagePercentage(): number {
    const total = this.diskTotal();
    if (total === 0) return 0;
    return Math.min(100, +(this.storageBytes() / total * 100).toFixed(1));
  }

  async loadReclamations() {
    this.loadingReclamations.set(true);
    try {
      const all = await this.authService.getReclamations();
      this.reclamations.set(all);
    } catch (e) {
      console.error('Failed to load reclamations', e);
    } finally {
      this.loadingReclamations.set(false);
    }
  }

  async loadAnnouncements() {
    try {
      this.announcements.set(await this.announcementService.list());
    } catch (e) {
      console.error('Failed to load announcements', e);
    } finally {
      this.loadingReclamations.set(false);
    }
  }

  async loadEvents() {
    try {
      this.events.set(await this.eventService.upcoming());
    } catch (e) {
      console.error('Failed to load events', e);
    }
  }

  statusLabel(s: string): string {
    switch (s) {
      case 'PENDING': return 'En attente';
      case 'APPROVED': return 'Approuvé';
      case 'REJECTED': return 'Rejeté';
      default: return s;
    }
  }

  priorityLabel(p: string): string {
    switch (p) {
      case 'FAIBLE': return 'Faible';
      case 'MOYENNE': return 'Moyenne';
      case 'NORMALE': return 'Normale';
      case 'HAUTE': return 'Haute';
      case 'CRITIQUE': return 'Critique';
      default: return p || 'Moyenne';
    }
  }

  announcementEyebrow(p: string): string {
    if (p === 'CRITIQUE') return 'Annonce importante';
    if (p === 'HAUTE') return 'Annonce prioritaire';
    return 'Annonce';
  }

  priorityClass(p: string): string {
    return 'priority-' + (p || 'moyenne').toLowerCase();
  }

  async ngOnInit() {
    await this.authService.ready();
    await Promise.all([
      this.refreshData(),
      this.refreshStorageStats(),
      this.loadReclamations(),
      this.loadAnnouncements(),
      this.loadEvents()
    ]);
  }

  toggleRecentGroup(employeeId: string) {
    const set = new Set(this.expandedRecentGroups());
    if (set.has(employeeId)) set.delete(employeeId);
    else set.add(employeeId);
    this.expandedRecentGroups.set(set);
  }

  openCalendarItem(item: any) {
    this.selectedCalendarItem = item;
  }

  openEmployee(emp: any) {
    this.router.navigate(['/employees', emp.id]);
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

  documentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      EMPLOYMENT_CONTRACT: 'Contrat', PAYSLIP: 'Paie', LEAVE_REQUEST: 'Congé',
      EVALUATION: 'Évaluation', TRAINING: 'Formation', ADMINISTRATIVE: 'Admin',
      PERSONAL_FILE: 'Dossier', OTHER: 'Autre', INVOICE: 'Facture', CONTRACT: 'Contrat'
    };
    return labels[type] ?? type;
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
    this.uploadType = this.uploadDocTypes[0];
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



  formatFileSize(bytes?: number | null): string {
    if (bytes == null || isNaN(bytes) || bytes < 0) return '—';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}