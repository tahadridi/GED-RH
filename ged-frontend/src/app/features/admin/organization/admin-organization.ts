import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrganizationService, Department, JobPosition } from '../../../core/services/organization.service';
import { AuthService } from '../../../core/services/auth.service';
import { LucideTrash2, LucideBuilding, LucideBriefcase, LucidePlus, LucideBuilding2, LucideSearch, LucideX, LucideAlertTriangle } from '@lucide/angular';

interface ConfirmState {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

@Component({
  selector: 'app-admin-organization',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideTrash2, LucideBuilding, LucideBriefcase, LucidePlus, LucideBuilding2, LucideSearch, LucideX, LucideAlertTriangle],
  templateUrl: './admin-organization.html'
})
export class AdminOrganization implements OnInit {
  departments = signal<Department[]>([]);
  loading = signal(false);
  readonly = signal(true);

searchQuery = signal('');

  newDept = { name: '', matriculePrefix: '', description: '' };

  // For nested position addition
  selectedDeptId: string | null = null;
  newPosTitle = '';

  confirmState = signal<ConfirmState | null>(null);

  totalPositions = computed(() => this.departments().reduce((sum, d) => sum + d.positions.length, 0));

  avgPositions = computed(() => {
    const count = this.departments().length;
    if (count === 0) return 0;
    return +(this.totalPositions() / count).toFixed(1);
  });

  filteredDepartments = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.departments();
    return this.departments().filter(d =>
      d.name.toLowerCase().includes(q) ||
      (d.matriculePrefix || '').toLowerCase().includes(q) ||
      d.positions.some(p => p.title.toLowerCase().includes(q))
    );
  });

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

  clearSearch() {
    this.searchQuery.set('');
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

  askDeleteDepartment(id: string) {
    this.confirmState.set({
      message: 'Supprimer ce département et tous ses postes ?',
      confirmLabel: 'Supprimer',
      onConfirm: async () => {
        await this.organizationService.deleteDepartment(id);
        await this.load();
      }
    });
  }

  askDeletePosition(id: string, title: string) {
    this.confirmState.set({
      message: `Supprimer le poste « ${title} » ?`,
      confirmLabel: 'Supprimer',
      onConfirm: async () => {
        await this.organizationService.deletePosition(id);
        await this.load();
      }
    });
  }

  closeConfirm() {
    this.confirmState.set(null);
  }

  async confirmAction() {
    const state = this.confirmState();
    if (!state) return;
    this.closeConfirm();
    await state.onConfirm();
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
}