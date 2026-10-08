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