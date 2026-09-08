import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const managerGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready();
  const p = auth.profile();
  if (!p || !p.roles.includes('MANAGER') || p.roles.includes('ADMINISTRATOR') || p.roles.includes('RH')) {
    return true;
  }
  if (router.url.startsWith('/employees')) {
    return router.createUrlTree(['/employees/equipe']);
  }
  if (router.url.startsWith('/documents')) {
    return router.createUrlTree(['/documents/equipe']);
  }
  return true;
};