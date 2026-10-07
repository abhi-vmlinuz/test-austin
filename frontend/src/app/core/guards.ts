import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = () => {
  if (localStorage.getItem('c2e_token')) return true;
  return inject(Router).createUrlTree(['/login']);
};

export function roleGuard(...allowed: string[]): CanActivateFn {
  return () => {
    const router = inject(Router);
    if (!localStorage.getItem('c2e_token')) return router.createUrlTree(['/login']);
    try {
      const u = JSON.parse(localStorage.getItem('c2e_user') || '{}');
      const role = String(u.role || '').toUpperCase();
      if (allowed.map((r) => r.toUpperCase()).includes(role)) return true;
    } catch { /* fallthrough */ }
    return router.createUrlTree(['/forbidden']);
  };
}
