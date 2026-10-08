import { Component, OnInit, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { DocumentService } from '../../../core/services/document.service';
import { ApiService } from '../../../core/services/api.service';
import { AnnouncementService } from '../../../core/services/announcement.service';
import { OrganizationService } from '../../../core/services/organization.service';
import { environment } from '../../../../environments/environment';
import { LucideUsers, LucideFileText, LucideAlertCircle, LucideBuilding2, LucideMegaphone, LucideChevronDown, LucideClock, LucideFiles } from '@lucide/angular';
import { SafeHtmlPipe } from '../../../shared/pipes/safe-html.pipe';
import { buildRecentGroups, buildMonthSeries, computeStorageAnalytics, buildStatusBreakdown, computeAverageTenure, countDepartments, countDocsThisMonth } from '../../../shared/analytics';
import { documentTypeShortLabel, employeeStatusLabel, formatBytesFrench, formatDateFr } from '../../../shared/document-types';

@Component({
  selector: 'app-dg-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideUsers, LucideFileText, LucideAlertCircle, LucideBuilding2, LucideMegaphone, LucideChevronDown, LucideClock, LucideFiles, SafeHtmlPipe],
  templateUrl: './dg-dashboard.html'
})
export class DgDashboard implements OnInit {
  apiUrl = environment.apiUrl;

  allEmployees = signal<any[]>([]);
  allDocuments = signal<any[]>([]);
  reclamations = signal<any[]>([]);
  recentDocuments = signal<any[]>([]);
  loading = signal(true);
  expandedRecentGroups = signal<Set<string>>(new Set());
  announcements = signal<any[]>([]);
  departments = signal<any[]>([]);
  diskTotal = signal(0);
  diskFree = signal(0);

  totalActiveEmployees = computed(() => this.allEmployees().filter(e => e.status === 'ACTIVE').length);
  totalEmployees = computed(() => this.allEmployees().filter(e => e.status !== 'TERMINATED').length);
  totalDocuments = computed(() => this.allDocuments().length);

  @ViewChild('hiresScroll') hiresScroll?: ElementRef<HTMLDivElement>;
  @ViewChild('departuresScroll') departuresScroll?: ElementRef<HTMLDivElement>;
  @ViewChild('reclScroll') reclScroll?: ElementRef<HTMLDivElement>;

  documentsThisMonth = computed(() => countDocsThisMonth(this.allDocuments()));

  departmentsCount = computed(() => countDepartments(this.allEmployees()));

  pendingReclamations = computed(() => this.reclamations().filter(r => r.status === 'PENDING'));

  reclamationsByMonth = computed(() => buildMonthSeries(this.reclamations(), 12, (r: any) => r.createdAt));

  departmentBreakdown = computed(() => {
    const empDept = new Map<string, number>();
    for (const e of this.allEmployees()) {
      const dept = e.department || 'Sans département';
      empDept.set(dept, (empDept.get(dept) || 0) + 1);
    }
    const docDept = new Map<string, number>();
    const empIdToDept = new Map<string, string>();
    for (const e of this.allEmployees()) {
      empIdToDept.set(e.id, e.department || 'Sans département');
    }
    for (const d of this.allDocuments()) {
      const dept = empIdToDept.get(d.employeeId) || 'Sans département';
      docDept.set(dept, (docDept.get(dept) || 0) + 1);
    }
    const maxEmp = Math.max(...Array.from(empDept.values()), 1);
    return Array.from(empDept.entries())
      .map(([dept, empCount]) => ({
        name: dept,
        employeeCount: empCount,
        docCount: docDept.get(dept) || 0,
        pct: (empCount / maxEmp) * 100
      }))
      .sort((a, b) => b.employeeCount - a.employeeCount);
  });

  docTypeDistribution = computed(() => {
    const counts = new Map<string, number>();
    const sizes = new Map<string, number>();
    for (const d of this.allDocuments()) {
      const t = d.type || 'OTHER';
      counts.set(t, (counts.get(t) || 0) + 1);
      sizes.set(t, (sizes.get(t) || 0) + (d.fileSize || 0));
    }
    const total = this.allDocuments().length || 1;
    return Array.from(counts.entries())
      .map(([type, count]) => ({
        type,
        label: this.documentTypeLabel(type),
        count,
        pct: (count / total) * 100,
        sizeBytes: sizes.get(type) || 0,
        sizeLabel: this.formatBytes(sizes.get(type) || 0)
      }))
      .sort((a, b) => b.count - a.count);
  });

  recentDocGroups = computed(() => buildRecentGroups(this.recentDocuments()));

  Math = Math;

  docTypeColors = ['#2563eb', '#8b5cf6', '#0d9488', '#f59e0b', '#ef4444', '#16a34a', '#64748b', '#e11d48'];

  departmentBreakdownTotal = computed(() =>
    this.departmentBreakdown().reduce((s, i) => s + i.employeeCount, 0)
  );

  statusBreakdown = computed(() => buildStatusBreakdown(this.allEmployees()));

  averageTenureYears = computed(() => computeAverageTenure(this.allEmployees()));

  hiresByMonth = computed(() => buildMonthSeries(this.allEmployees(), 12, (e: any) => e.hireDate));
  departuresByMonth = computed(() => buildMonthSeries(this.allEmployees().filter(e => e.status === 'TERMINATED' && e.terminationDate), 12, (e: any) => e.terminationDate));
  totalDepartures = computed(() => this.allEmployees().filter(e => e.status === 'TERMINATED').length);
  docsByMonth = computed(() => buildMonthSeries(this.allDocuments(), 12, (d: any) => d.createdAt));
  maxHiresCount = computed(() => Math.max(...this.hiresByMonth().map(m => m.count), 1));
  maxDocsCount = computed(() => Math.max(...this.docsByMonth().map(m => m.count), 1));

  private storageAnalytics = computed(() => computeStorageAnalytics(
    this.allEmployees(),
    this.allDocuments(),
    this.diskTotal(),
    b => this.formatBytes(b)
  ));

  docSizeTotal = computed(() => this.storageAnalytics().docSizeTotal);
  storageByDepartment = computed(() => this.storageAnalytics().storageByDepartment);
  docsPerEmployee = computed(() => this.storageAnalytics().docsPerEmployee);
  employeesWithoutDoc = computed(() => this.storageAnalytics().employeesWithoutDoc);
  docsThisMonthByDepartment = computed(() => this.storageAnalytics().docsThisMonthByDepartment);
  get docStorageUsedLabel() { return this.storageAnalytics().docStorageUsedLabel; }
  get docStorageOfDiskPct() { return this.storageAnalytics().docStorageOfDiskPct; }
  get diskTotalLabel() { return this.storageAnalytics().diskTotalLabel; }

  departmentFillRate = computed(() => {
    const employeesByDept = new Map<string, number>();
    for (const e of this.allEmployees()) {
      const dept = e.department || 'Sans département';
      employeesByDept.set(dept, (employeesByDept.get(dept) || 0) + 1);
    }
    return this.departments().map(d => {
      const occupied = employeesByDept.get(d.name) || 0;
      const total = d.positions?.length || 0;
      return {
        name: d.name,
        occupied,
        total,
        rate: total > 0 ? Math.min(100, +((occupied / total) * 100).toFixed(1)) : 0
      };
    }).sort((a, b) => b.rate - a.rate);
  });

  barHeight(rate: number): number {
    return Math.max(rate, 3);
  }

  formatBytes(bytes?: number | null): string {
    return formatBytesFrench(bytes);
  }

  get deptGradient(): string {
    const items = this.departmentBreakdown();
    const total = items.reduce((s, i) => s + i.employeeCount, 0) || 1;
    let acc = 0;
    const segments = items.map((it, i) => {
      const start = acc;
      acc += (it.employeeCount / total) * 100;
      const color = this.docTypeColors[i % this.docTypeColors.length];
      return `${color} ${start}% ${acc}%`;
    }).join(', ');
    return `conic-gradient(${segments || '#edf0f4 0% 100%'})`;
  }

  get docTypeGradient(): string {
    const items = this.docTypeDistribution();
    let acc = 0;
    const segments = items.map((it, i) => {
      const start = acc;
      acc += it.pct;
      const color = this.docTypeColors[i % this.docTypeColors.length];
      return `${color} ${start}% ${acc}%`;
    }).join(', ');
    return `conic-gradient(${segments || '#edf0f4 0% 100%'})`;
  }

  constructor(
    private authService: AuthService,
    private employeeService: EmployeeService,
    private documentService: DocumentService,
    private apiService: ApiService,
    private announcementService: AnnouncementService,
    private organizationService: OrganizationService
  ) {}

  get userName() {
    const p = this.authService.profile();
    return p ? `${p.firstName} ${p.lastName}` : '';
  }

  isDirectionGenerale(a: any): boolean {
    return a.authorRole === 'DIRECTION_GENERALE';
  }

  async ngOnInit() {
    await this.authService.ready();

    // Load employees and documents unconditionally
    try {
      const emps = await this.employeeService.list();
      this.allEmployees.set(emps);
    } catch (e) {
      console.error('Failed to load employees', e);
    }

    try {
      const docs = await this.documentService.search({});
      this.allDocuments.set(docs);

      const sorted = [...docs].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ).slice(0, 6);
      this.recentDocuments.set(sorted);
      this.expandAllRecentGroups();
    } catch (e) {
      console.error('Failed to load documents', e);
    }

    // Load reclamations independently
    try {
      const reclas = await this.apiService.get<any[]>('/reclamations');
      this.reclamations.set(reclas || []);
    } catch (e) {
      console.warn('Reclamations not available for DG', e);
    }

    // Load announcements
    try {
      this.announcements.set(await this.announcementService.list());
    } catch (e) {
      console.warn('Announcements not available', e);
    }

    // Load organization (departments + positions) for fill-rate stats
    try {
      this.departments.set(await this.organizationService.listDepartments());
    } catch (e) {
      console.warn('Organization not available', e);
    }

    // Load storage info for DG
    try {
      const [stats, disk] = await Promise.all([
        this.apiService.get<any>('/storage/stats'),
        this.apiService.get<any>('/storage/disk')
      ]);
      this.diskTotal.set(disk?.totalSpace || 0);
      this.diskFree.set(disk?.freeSpace || 0);
    } catch (e) {
      console.warn('Storage stats not available', e);
    }

    this.loading.set(false);

    setTimeout(() => {
      const h = this.hiresScroll?.nativeElement;
      if (h) h.scrollLeft = h.scrollWidth - h.clientWidth;
      const d = this.departuresScroll?.nativeElement;
      if (d) d.scrollLeft = d.scrollWidth - d.clientWidth;
      const r = this.reclScroll?.nativeElement;
      if (r) {
        const cur = r.querySelector('[data-current="true"]') as HTMLElement | null;
        if (cur) {
          r.scrollLeft = Math.max(0, cur.offsetLeft - (r.clientWidth - cur.offsetWidth) / 2);
        }
      }
    }, 80);
  }

  toggleRecentGroup(employeeId: string) {
    const set = new Set(this.expandedRecentGroups());
    if (set.has(employeeId)) set.delete(employeeId);
    else set.add(employeeId);
    this.expandedRecentGroups.set(set);
  }

  expandAllRecentGroups() {
    const set = new Set(this.recentDocGroups().map(g => g.employeeId));
    this.expandedRecentGroups.set(set);
  }

  async openDocument(doc: any) {
    try {
      await this.documentService.open(doc.id, doc.name);
    } catch (e) {
      console.error('Failed to open document', e);
    }
  }

  statusLabel(s: string): string {
    return employeeStatusLabel(s);
  }

  documentTypeLabel(type: string): string {
    return documentTypeShortLabel(type);
  }

  formatDate(d: string) {
    return formatDateFr(d);
  }
}
