import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { DocumentService } from '../../../core/services/document.service';
import { LucideUsers, LucideFileText, LucideEye } from '@lucide/angular';

@Component({
  selector: 'app-dg-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideUsers, LucideFileText, LucideEye],
  templateUrl: './dg-dashboard.html'
})
export class DgDashboard implements OnInit {
  totalEmployees = signal(0);
  totalDocuments = signal(0);
  loading = signal(true);

  constructor(
    private authService: AuthService,
    private employeeService: EmployeeService,
    private documentService: DocumentService
  ) {}

  get userName() {
    const p = this.authService.profile();
    return p ? `${p.firstName} ${p.lastName}` : '';
  }

  async ngOnInit() {
    try {
      const [emps, docs] = await Promise.all([
        this.employeeService.list(),
        this.documentService.search({})
      ]);
      this.totalEmployees.set(emps.length);
      this.totalDocuments.set(docs.length);
    } finally {
      this.loading.set(false);
    }
  }
}
