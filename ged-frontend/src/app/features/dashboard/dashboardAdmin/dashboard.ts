import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EmployeeService } from '../../../core/services/employee.service';
import { DocumentService } from '../../../core/services/document.service';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styles: ``
})
export class Dashboard implements OnInit {
  // Signals
  totalEmployees = signal(0);
  totalDocuments = signal(0);
  recentDocuments = signal<any[]>([]);
  allEmployees = signal<any[]>([]);
  allDocuments = signal<any[]>([]);
  loading = signal(true);

  constructor(
    private employeeService: EmployeeService,
    private documentService: DocumentService,
    private authService: AuthService,
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
    const types = ['Contrats', 'Factures', 'Rapports', 'Autres'];
    const typeMap: Record<string, string[]> = {
      'Contrats': ['EMPLOYMENT_CONTRACT', 'CONTRACT'],
      'Factures': ['INVOICE', 'PAYSLIP'],
      'Rapports': ['EVALUATION', 'REPORT'],
      'Autres': ['LEAVE_REQUEST', 'TRAINING', 'ADMINISTRATIVE', 'PERSONAL_FILE', 'OTHER']
    };
    const counts = types.map(type => {
      const keys = typeMap[type];
      return this.allDocuments().filter(doc => keys.includes(doc.type)).length;
    });
    const total = counts.reduce((a, b) => a + b, 0);
    return types.map((name, i) => ({
      name,
      count: counts[i],
      percentage: total === 0 ? 0 : (counts[i] / total) * 100
    }));
  }

  get storageUsed(): number {
    // Approx 2 MB per document (no file size tracking yet)
    return Math.round(this.totalDocuments() * 2);
  }

  get storagePercentage(): number {
    // Assuming a 500 MB quota
    return Math.min(100, +(this.storageUsed / 5).toFixed(1));
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
      this.recentDocuments.set(docs.slice(0, 5));
    } catch (e) {
      console.error('Refresh failed', e);
    } finally {
      this.loading.set(false);
    }
  }

  async ngOnInit() {
    await this.refreshData();
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
}