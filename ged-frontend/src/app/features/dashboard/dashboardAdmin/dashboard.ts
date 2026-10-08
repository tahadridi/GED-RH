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
  buildRecentGroups,
  buildMonthSeries,
  computeStorageAnalytics,
  countDepartments,
  countDocsThisMonth,
  buildCalendarEvents,
  currentGreeting,
  formatBytesBinary
} from '../../../shared/analytics';
import {
  documentTypeShortLabel,
  reclamationStatusLabel,
  announcementPriorityLabel,
  announcementEyebrow as announcementEyebrowFn,
  formatBytesFrench
} from '../../../shared/document-types';
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

  departmentsCount = computed(() => countDepartments(this.allEmployees()));

  calendarEvents = computed(() => buildCalendarEvents(this.events(), this.announcements()));

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

  recentGroups = computed(() => buildRecentGroups(this.recentDocuments()));

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
    return currentGreeting();
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
    return countDocsThisMonth(this.allDocuments());
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

  docsByMonth = computed(() => buildMonthSeries(this.allDocuments(), 12, (d: any) => d.createdAt));

  private storageAnalytics = computed(() => computeStorageAnalytics(
    this.allEmployees(),
    this.allDocuments(),
    this.diskTotal(),
    b => this.formatFileSize(b)
  ));

  docSizeTotal = computed(() => this.storageAnalytics().docSizeTotal);
  storageByDepartment = computed(() => this.storageAnalytics().storageByDepartment);
  docsPerEmployee = computed(() => this.storageAnalytics().docsPerEmployee);
  employeesWithoutDoc = computed(() => this.storageAnalytics().employeesWithoutDoc);
  docsThisMonthByDepartment = computed(() => this.storageAnalytics().docsThisMonthByDepartment);

  get docStorageUsedLabel(): string {
    return this.storageAnalytics().docStorageUsedLabel;
  }

  get docStorageOfDiskPct(): number {
    return this.storageAnalytics().docStorageOfDiskPct;
  }

  get diskTotalLabel(): string {
    return this.storageAnalytics().diskTotalLabel;
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
    return formatBytesBinary(this.storageBytes());
  }

  get storageFree(): string {
    return formatBytesBinary(this.diskFree());
  }

  get storageTotal(): string {
    return formatBytesBinary(this.diskTotal());
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
    return reclamationStatusLabel(s);
  }

  priorityLabel(p: string): string {
    return announcementPriorityLabel(p);
  }

  announcementEyebrow(p: string): string {
    return announcementEyebrowFn(p);
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
    return documentTypeShortLabel(type);
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
    return formatBytesFrench(bytes);
  }
}