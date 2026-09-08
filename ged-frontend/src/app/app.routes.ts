import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Shell } from './shared/components/shell/shell';
import { authGuard } from './core/guards/auth.guard';
import { managerGuard } from './core/guards/manager.guard';

export const routes: Routes = [
  { path: 'auth/login', component: Login },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      // Calendar
      {
        path: 'calendar',
        loadComponent: () => import('./features/calendar/calendar').then(m => m.CalendarComponent)
      },
      // Admin dashboard
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboardAdmin/dashboard').then(m => m.Dashboard)
      },
      // RH dashboard
      {
        path: 'dashboard/rh',
        loadComponent: () => import('./features/dashboard/rh-dashboard/rh-dashboard').then(m => m.RhDashboard)
      },
      // Manager dashboard
      {
        path: 'dashboard/manager',
        loadComponent: () => import('./features/dashboard/manager-dashboard/manager-dashboard').then(m => m.ManagerDashboard)
      },
      {
        path: 'dashboard/manager/organigramme',
        loadComponent: () => import('./features/dashboard/manager-dashboard/manager-organigramme').then(m => m.ManagerOrganigramme)
      },
      // Direction Générale dashboard
      {
        path: 'dashboard/dg',
        loadComponent: () => import('./features/dashboard/dg-dashboard/dg-dashboard').then(m => m.DgDashboard)
      },
      // Shared routes
      {
        path: 'employees',
        loadComponent: () => import('./features/employees/employees-list/employees-list').then(m => m.EmployeesList),
        canActivate: [managerGuard]
      },
      {
        path: 'employees/equipe',
        loadComponent: () => import('./features/employees/manager-employees/manager-employees').then(m => m.ManagerEmployees)
      },
      {
        path: 'employees/:id',
        loadComponent: () => import('./features/employees/employee-detail/employee-detail').then(m => m.EmployeeDetail)
      },
      {
        path: 'documents',
        loadComponent: () => import('./features/documents/documents-list/documents-list').then(m => m.DocumentsList),
        canActivate: [managerGuard]
      },
      {
        path: 'documents/equipe',
        loadComponent: () => import('./features/documents/manager-documents/manager-documents').then(m => m.ManagerDocuments)
      },
      {
        path: 'reclamations',
        loadComponent: () => import('./features/reclamations/user-reclamations').then(m => m.UserReclamations)
      },
      {
        path: 'search',
        loadComponent: () => import('./features/search/search').then(m => m.Search)
      },
      {
        path: 'admin/users',
        loadComponent: () => import('./features/admin/users/admin-users').then(m => m.AdminUsers)
      },
      {
        path: 'admin/organization',
        loadComponent: () => import('./features/admin/organization/admin-organization').then(m => m.AdminOrganization)
      },
      {
        path: 'admin/doc-types',
        loadComponent: () => import('./features/admin/doc-types/admin-doc-types').then(m => m.AdminDocTypes)
      },
      {
        path: 'admin/announcements',
        loadComponent: () => import('./features/admin/announcements/admin-announcements').then(m => m.AdminAnnouncements)
      },
      {
        path: 'admin/organigramme',
        loadComponent: () => import('./features/admin/organigramme/admin-organigramme').then(m => m.AdminOrganigramme)
      },
    ]
  },
  { path: '**', redirectTo: 'auth/login' }
];
