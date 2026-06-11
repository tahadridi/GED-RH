import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DocumentService } from '../../core/services/document.service';
import { EmployeeService } from '../../core/services/employee.service';
import { EmployeeDocument } from '../../core/models/document.model';
import { Employee } from '../../core/models/employee.model';
import { DocumentType } from '../../core/models/user.model';
import { LucideSearch, LucideFileText, LucideUser, LucideDownload } from '@lucide/angular';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideSearch, LucideFileText, LucideUser, LucideDownload],
  templateUrl: './search.html'
})
export class Search {
  query = '';
  selectedType: DocumentType | '' = '';
  selectedDept = '';
  documents = signal<EmployeeDocument[]>([]);
  employees = signal<Employee[]>([]);
  loading = signal(false);
  searched = signal(false);

  docTypes: DocumentType[] = [
    'PERSONAL_FILE','EMPLOYMENT_CONTRACT','PAYSLIP','LEAVE_REQUEST',
    'EVALUATION','TRAINING','ADMINISTRATIVE','OTHER'
  ];
  docTypeLabels: Record<string, string> = {
    PERSONAL_FILE: 'Dossier personnel', EMPLOYMENT_CONTRACT: 'Contrat de travail',
    PAYSLIP: 'Bulletin de paie', LEAVE_REQUEST: 'Demande de congé',
    EVALUATION: 'Évaluation', TRAINING: 'Formation',
    ADMINISTRATIVE: 'Administratif', OTHER: 'Autre'
  };

  constructor(
    private documentService: DocumentService,
    private employeeService: EmployeeService
  ) {}

  async search() {
    if (!this.query && !this.selectedType && !this.selectedDept) return;
    this.loading.set(true);
    this.searched.set(true);
    try {
      const params: any = {};
      if (this.query) params.q = this.query;
      if (this.selectedType) params.type = this.selectedType;
      if (this.selectedDept) params.department = this.selectedDept;

      const [docs, emps] = await Promise.all([
        this.documentService.search(params),
        this.employeeService.list()
      ]);

      const q = this.query.toLowerCase();
      const filteredEmps = q ? emps.filter(e =>
        e.firstName.toLowerCase().includes(q) ||
        e.lastName.toLowerCase().includes(q) ||
        e.matricule.toLowerCase().includes(q) ||
        (e.department ?? '').toLowerCase().includes(q)
      ) : [];

      this.documents.set(docs);
      this.employees.set(filteredEmps);
    } finally {
      this.loading.set(false);
    }
  }

  async download(doc: EmployeeDocument) {
    await this.documentService.download(doc.id, doc.name);
  }
}
