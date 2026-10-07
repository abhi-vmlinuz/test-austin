import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = () => {
  if (localStorage.getItem('c2e_token')) return true;
  return inject(Router).createUrlTree(['/login']);
};

export const roleGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  if (!localStorage.getItem('c2e_token')) return router.createUrlTree(['/login']);
  const allowed: string[] | undefined = route.data?.['roles'];
  if (!allowed || !allowed.length) return true;
  try {
    const u = JSON.parse(localStorage.getItem('c2e_user') || '{}');
    const role = String(u.role || '').toUpperCase();
    if (allowed.map((r) => r.toUpperCase()).includes(role)) return true;
  } catch { /* fallthrough */ }
  return router.createUrlTree(['/dashboard']);
};
