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

  documentsThisMonth = computed(() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    return this.allDocuments().filter(d => {
      const dt = new Date(d.createdAt);
      return dt.getMonth() === m && dt.getFullYear() === y;
    }).length;
  });

  departmentsCount = computed(() => {
    const depts = new Set(this.allEmployees().map(e => e.department).filter(Boolean));
    return depts.size;
  });

  pendingReclamations = computed(() => this.reclamations().filter(r => r.status === 'PENDING'));

  reclamationsByMonth = computed(() => this.monthSeries(this.reclamations(), 12, (r: any) => r.createdAt));

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

  recentDocGroups = computed(() => {
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

  Math = Math;

  docTypeColors = ['#2563eb', '#8b5cf6', '#0d9488', '#f59e0b', '#ef4444', '#16a34a', '#64748b', '#e11d48'];

  departmentBreakdownTotal = computed(() =>
    this.departmentBreakdown().reduce((s, i) => s + i.employeeCount, 0)
  );

  statusBreakdown = computed(() => {
    const labels: Record<string, string> = { ACTIVE: 'Actif', ON_LEAVE: 'En congé', TERMINATED: 'Terminé' };
    const order = ['ACTIVE', 'ON_LEAVE', 'TERMINATED'];
    const counts = new Map<string, number>();
    for (const e of this.allEmployees()) {
      const s = e.status || 'ACTIVE';
      counts.set(s, (counts.get(s) || 0) + 1);
    }
    const total = this.allEmployees().length || 1;
    return order
      .filter(s => counts.has(s))
      .map(s => ({
        status: s,
        label: labels[s] ?? s,
        count: counts.get(s) || 0,
        pct: ((counts.get(s) || 0) / total) * 100
      }));
  });

  averageTenureYears = computed(() => {
    const emps = this.allEmployees().filter(e => e.hireDate && e.status !== 'TERMINATED');
    if (emps.length === 0) return 0;
    let totalDays = 0;
    for (const e of emps) {
      totalDays += (Date.now() - new Date(e.hireDate).getTime()) / 86400000;
    }
    return totalDays / 365.25 / emps.length;
  });

  hiresByMonth = computed(() => this.monthSeries(this.allEmployees(), 12, (e: any) => e.hireDate));
  departuresByMonth = computed(() => this.monthSeries(this.allEmployees().filter(e => e.status === 'TERMINATED' && e.terminationDate), 12, (e: any) => e.terminationDate));
  totalDepartures = computed(() => this.allEmployees().filter(e => e.status === 'TERMINATED').length);
  docsByMonth = computed(() => this.monthSeries(this.allDocuments(), 12, (d: any) => d.createdAt));
  maxHiresCount = computed(() => Math.max(...this.hiresByMonth().map(m => m.count), 1));
  maxDocsCount = computed(() => Math.max(...this.docsByMonth().map(m => m.count), 1));

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
      .map(([name, sizeBytes]) => ({
        name,
        sizeBytes,
        sizeLabel: this.formatBytes(sizeBytes),
        pct: (sizeBytes / total) * 100
      }))
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

  formatBytes(bytes?: number | null): string {
    if (bytes == null || isNaN(bytes) || bytes < 0) return '0 o';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
  }

  get docStorageUsedLabel(): string {
    return this.formatBytes(this.docSizeTotal());
  }

  get docStorageOfDiskPct(): number {
    const total = this.diskTotal();
    if (total <= 0) return 0;
    return Math.min(100, +((this.docSizeTotal() / total) * 100).toFixed(1));
  }

  get diskTotalLabel(): string {
    return this.formatBytes(this.diskTotal());
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
    const m: Record<string, string> = { ACTIVE: 'Actif', ON_LEAVE: 'En congé', TERMINATED: 'Terminé' };
    return m[s] ?? s;
  }

  documentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      EMPLOYMENT_CONTRACT: 'Contrat', PAYSLIP: 'Paie', LEAVE_REQUEST: 'Congé',
      EVALUATION: 'Évaluation', TRAINING: 'Formation', ADMINISTRATIVE: 'Admin',
      PERSONAL_FILE: 'Dossier', OTHER: 'Autre', INVOICE: 'Facture', CONTRACT: 'Contrat'
    };
    return labels[type] ?? type;
  }

  formatDate(d: string) {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
