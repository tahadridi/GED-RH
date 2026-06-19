import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrganizationService, Department, JobPosition } from '../../../core/services/organization.service';
import { AuthService } from '../../../core/services/auth.service';
import { LucideTrash2, LucideBuilding, LucideBriefcase } from '@lucide/angular';

@Component({
  selector: 'app-admin-organization',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideTrash2, LucideBuilding, LucideBriefcase],
  templateUrl: './admin-organization.html'
})
export class AdminOrganization implements OnInit {
  departments = signal<Department[]>([]);
  loading = signal(false);
  readonly = signal(true);

  newDept = { name: '', matriculePrefix: '', description: '' };
  
  // For nested position addition
  selectedDeptId: string | null = null;
  newPosTitle = '';

  constructor(
    private organizationService: OrganizationService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    await this.authService.ready();
    const p = this.authService.profile();
    this.readonly.set(!p?.roles.includes('ADMINISTRATOR'));
    await this.load();
  }

  async load() {
    this.loading.set(true);
    try {
      const depts = await this.organizationService.listDepartments();
      this.departments.set(depts);
    } finally {
      this.loading.set(false);
    }
  }

  async addDepartment() {
    if (!this.newDept.name || !this.newDept.matriculePrefix) return;
    try {
      await this.organizationService.createDepartment(this.newDept);
      this.newDept = { name: '', matriculePrefix: '', description: '' };
      await this.load();
    } catch (e) {
      console.error('Failed to add department', e);
    }
  }

  async deleteDepartment(id: string) {
    if (!confirm('Supprimer ce département et tous ses postes ?')) return;
    await this.organizationService.deleteDepartment(id);
    await this.load();
  }

  async addPosition(deptId: string) {
    if (!this.newPosTitle) return;
    try {
      await this.organizationService.createPosition({ departmentId: deptId, title: this.newPosTitle });
      this.newPosTitle = '';
      this.selectedDeptId = null;
      await this.load();
    } catch (e) {
      console.error('Failed to add position', e);
    }
  }

  async deletePosition(id: string) {
    if (!confirm('Supprimer ce poste ?')) return;
    await this.organizationService.deletePosition(id);
    await this.load();
  }
}
