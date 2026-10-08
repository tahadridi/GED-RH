import { EMPLOYEE_STATUS_LABELS } from './document-types';

export interface RecentDocGroup {
  employeeId: string;
  employeeFirstName: string;
  employeeLastName: string;
  employeeMatricule: string;
  employeeHasPhoto: boolean;
  documents: any[];
}

export function buildRecentGroups(documents: any[]): RecentDocGroup[] {
  const map = new Map<string, RecentDocGroup>();
  for (const doc of documents) {
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
}

export interface MonthPoint {
  month: string;
  count: number;
  pct: number;
  isCurrent: boolean;
}

export function buildMonthSeries<T>(items: T[], months: number, dateOf: (t: T) => string): MonthPoint[] {
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

export interface StorageAnalytics {
  docSizeTotal: number;
  storageByDepartment: { name: string; sizeBytes: number; sizeLabel: string; pct: number }[];
  docsPerEmployee: number;
  employeesWithoutDoc: number;
  docsThisMonthByDepartment: { name: string; count: number }[];
  docStorageUsedLabel: string;
  docStorageOfDiskPct: number;
  diskTotalLabel: string;
}

export function computeStorageAnalytics(
  employees: any[],
  documents: any[],
  diskTotal: number,
  formatBytes: (bytes?: number | null) => string
): StorageAnalytics {
  const docSizeTotal = documents.reduce((s, d) => s + (d.fileSize || 0), 0);
  const empIdToDept = new Map<string, string>();
  for (const e of employees) empIdToDept.set(e.id, e.department || 'Sans département');

  const deptSize = new Map<string, number>();
  for (const d of documents) {
    const dept = empIdToDept.get(d.employeeId) || 'Sans département';
    deptSize.set(dept, (deptSize.get(dept) || 0) + (d.fileSize || 0));
  }
  const distTotal = docSizeTotal || 1;

  const docsThisMonthByDepartment = (() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    const counts = new Map<string, number>();
    for (const d of documents) {
      const dt = new Date(d.createdAt);
      if (dt.getMonth() !== m || dt.getFullYear() !== y) continue;
      const dept = empIdToDept.get(d.employeeId) || 'Sans département';
      counts.set(dept, (counts.get(dept) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  })();

  return {
    docSizeTotal,
    storageByDepartment: Array.from(deptSize.entries())
      .map(([name, sizeBytes]) => ({ name, sizeBytes, sizeLabel: formatBytes(sizeBytes), pct: (sizeBytes / distTotal) * 100 }))
      .sort((a, b) => b.sizeBytes - a.sizeBytes),
    docsPerEmployee: documents.length / (employees.length || 1),
    employeesWithoutDoc: (() => {
      const ids = new Set(documents.map(d => d.employeeId));
      return employees.filter(e => !ids.has(e.id)).length;
    })(),
    docsThisMonthByDepartment,
    docStorageUsedLabel: formatBytes(docSizeTotal),
    docStorageOfDiskPct: diskTotal <= 0 ? 0 : Math.min(100, +((docSizeTotal / diskTotal) * 100).toFixed(1)),
    diskTotalLabel: formatBytes(diskTotal)
  };
}

export interface CalendarEntry {
  title: string;
  date: Date;
  startTime: string;
  priority: string;
  type: string;
  raw: any;
}

export function buildCalendarEvents(events: any[], announcements: any[]): CalendarEntry[] {
  const now = new Date();
  const entries: CalendarEntry[] = [];
  for (const ev of events) {
    const d = new Date(ev.eventDate);
    entries.push({ title: ev.title, date: d, startTime: ev.startTime || '', priority: ev.priority || 'NORMALE', type: 'event', raw: ev });
  }
  for (const a of announcements) {
    const d = new Date(a.createdAt);
    entries.push({ title: a.title, date: d, startTime: '', priority: a.priority, type: 'announcement', raw: a });
  }
  return entries
    .filter(e => e.date >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 6);
}

export function buildStatusBreakdown(employees: any[]): { status: string; label: string; count: number; pct: number }[] {
  const order = ['ACTIVE', 'ON_LEAVE', 'TERMINATED'];
  const counts = new Map<string, number>();
  for (const e of employees) {
    const s = e.status || 'ACTIVE';
    counts.set(s, (counts.get(s) || 0) + 1);
  }
  const total = employees.length || 1;
  return order
    .filter(s => counts.has(s))
    .map(s => ({
      status: s,
      label: EMPLOYEE_STATUS_LABELS[s] ?? s,
      count: counts.get(s) || 0,
      pct: ((counts.get(s) || 0) / total) * 100
    }));
}

export function computeAverageTenure(employees: any[]): number {
  const emps = employees.filter(e => e.hireDate && e.status !== 'TERMINATED');
  if (emps.length === 0) return 0;
  let totalDays = 0;
  for (const e of emps) {
    totalDays += (Date.now() - new Date(e.hireDate).getTime()) / 86400000;
  }
  return totalDays / 365.25 / emps.length;
}

export function countDepartments(employees: any[]): number {
  return new Set(employees.map(e => e.department).filter(Boolean)).size;
}

export function countDocsThisMonth(documents: any[]): number {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  return documents.filter(d => {
    const dt = new Date(d.createdAt);
    return dt.getMonth() === m && dt.getFullYear() === y;
  }).length;
}

export function currentGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

export function formatBytesBinary(bytes: number): string {
  if (bytes === 0) return '0';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}