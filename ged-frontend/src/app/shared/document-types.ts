import { EmployeeDocument } from '../core/models/document.model';

export const DOCUMENT_TYPES: string[] = [
  'PERSONAL_FILE', 'EMPLOYMENT_CONTRACT', 'PAYSLIP', 'LEAVE_REQUEST',
  'EVALUATION', 'TRAINING', 'ADMINISTRATIVE', 'DISCIPLINARY', 'OTHER'
];

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  PERSONAL_FILE: 'Dossier personnel', EMPLOYMENT_CONTRACT: 'Contrat de travail',
  PAYSLIP: 'Bulletin de paie', LEAVE_REQUEST: 'Demande de congé',
  EVALUATION: 'Évaluation', TRAINING: 'Formation',
  ADMINISTRATIVE: 'Administratif', DISCIPLINARY: 'Document disciplinaire', OTHER: 'Autre'
};

export interface EmployeeGroup {
  employeeId: string;
  employeeFirstName: string;
  employeeLastName: string;
  employeeMatricule: string;
  employeeHasPhoto: boolean;
  documents: EmployeeDocument[];
}

export function buildEmployeeGroups(documents: EmployeeDocument[]): EmployeeGroup[] {
  const map = new Map<string, EmployeeGroup>();
  for (const doc of documents) {
    const key = doc.employeeId;
    if (!map.has(key)) {
      map.set(key, {
        employeeId: doc.employeeId,
        employeeFirstName: doc.employeeFirstName,
        employeeLastName: doc.employeeLastName,
        employeeMatricule: doc.employeeMatricule,
        employeeHasPhoto: doc.employeeHasPhoto,
        documents: []
      });
    }
    map.get(key)!.documents.push(doc);
  }
  return Array.from(map.values()).sort((a, b) =>
    (a.employeeLastName + a.employeeFirstName).localeCompare(b.employeeLastName + b.employeeFirstName)
  );
}

export function buildTypeGroups(byType: Record<string, number>, total: number) {
  const denom = total || 1;
  return DOCUMENT_TYPES
    .map(t => ({ type: t, label: DOCUMENT_TYPE_LABELS[t], count: byType[t] ?? 0, pct: Math.round(((byType[t] ?? 0) / denom) * 100) }))
    .filter(g => g.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export const DOCUMENT_SHORT_LABELS: Record<string, string> = {
  EMPLOYMENT_CONTRACT: 'Contrat', PAYSLIP: 'Paie', LEAVE_REQUEST: 'Congé',
  EVALUATION: 'Évaluation', TRAINING: 'Formation', ADMINISTRATIVE: 'Admin',
  PERSONAL_FILE: 'Dossier', OTHER: 'Autre', INVOICE: 'Facture', CONTRACT: 'Contrat'
};

export function documentTypeShortLabel(type: string): string {
  return DOCUMENT_SHORT_LABELS[type] ?? type;
}

export const EMPLOYEE_STATUS_LABELS: Record<string, string> = { ACTIVE: 'Actif', ON_LEAVE: 'En congé', TERMINATED: 'Terminé' };

export function employeeStatusLabel(status: string): string {
  return EMPLOYEE_STATUS_LABELS[status] ?? status;
}

export const RECLAMATION_STATUS_LABELS: Record<string, string> = { PENDING: 'En attente', APPROVED: 'Approuvé', REJECTED: 'Rejeté' };

export function reclamationStatusLabel(status: string): string {
  return RECLAMATION_STATUS_LABELS[status] ?? status;
}

export const ANNOUNCEMENT_PRIORITY_LABELS: Record<string, string> = {
  FAIBLE: 'Faible', MOYENNE: 'Moyenne', NORMALE: 'Normale', HAUTE: 'Haute', CRITIQUE: 'Critique'
};

export function announcementPriorityLabel(priority: string): string {
  return ANNOUNCEMENT_PRIORITY_LABELS[priority] ?? (priority || 'Moyenne');
}

export function announcementEyebrow(priority: string): string {
  if (priority === 'CRITIQUE') return 'Annonce importante';
  if (priority === 'HAUTE') return 'Annonce prioritaire';
  return 'Annonce';
}

export function formatBytesFrench(bytes?: number | null): string {
  if (bytes == null || isNaN(bytes) || bytes < 0) return '0 o';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}

export function formatDateFr(d: string): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}