import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EmployeeService } from '../../../core/services/employee.service';
import { DocumentService } from '../../../core/services/document.service';
import { AuthService } from '../../../core/services/auth.service';
import { LucideUsers, LucideFileText, LucideActivity } from '@lucide/angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideUsers, LucideFileText, LucideActivity],
  templateUrl: './dashboard.html',
  styles: ``
})
export class Dashboard implements OnInit {
  totalEmployees = signal(0);
  totalDocuments = signal(0);
  recentDocuments = signal<any[]>([]);
  loading = signal(true);

  constructor(
    private employeeService: EmployeeService,
    private documentService: DocumentService,
    private authService: AuthService
  ) {}

  get userEmail() { return this.authService.user()?.email ?? ''; }
  get userInitial() { return this.userEmail.charAt(0).toUpperCase(); }

  async ngOnInit() {
    try {
      const [employees, docs] = await Promise.all([
        this.employeeService.list(),
        this.documentService.search({})
      ]);
      this.totalEmployees.set(employees.length);
      this.totalDocuments.set(docs.length);
      this.recentDocuments.set(docs.slice(0, 5));
    } catch (e) {
      // silently fail if no data yet
    } finally {
      this.loading.set(false);
    }
  }

  documentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      EMPLOYMENT_CONTRACT: 'Contrat', PAYSLIP: 'Paie', LEAVE_REQUEST: 'Congé',
      EVALUATION: 'Évaluation', TRAINING: 'Formation', ADMINISTRATIVE: 'Admin',
      PERSONAL_FILE: 'Dossier', OTHER: 'Autre'
    };
    return labels[type] ?? type;
  }
}
