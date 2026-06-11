import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Shell } from './shared/components/shell/shell';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'auth/login', component: Login },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
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
      // Direction Générale dashboard
      {
        path: 'dashboard/dg',
        loadComponent: () => import('./features/dashboard/dg-dashboard/dg-dashboard').then(m => m.DgDashboard)
      },
      // Shared routes
      {
        path: 'employees',
        loadComponent: () => import('./features/employees/employees-list/employees-list').then(m => m.EmployeesList)
      },
      {
        path: 'employees/:id',
        loadComponent: () => import('./features/employees/employee-detail/employee-detail').then(m => m.EmployeeDetail)
      },
      {
        path: 'documents',
        loadComponent: () => import('./features/documents/documents-list/documents-list').then(m => m.DocumentsList)
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
      }
    ]
  },
  { path: '**', redirectTo: 'auth/login' }
];
