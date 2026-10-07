import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { tap } from 'rxjs';

export interface User { id?: number; user_id?: number; name: string; email: string; role: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  get token(): string | null { return localStorage.getItem('c2e_token'); }
  get user(): User | null {
    try { return JSON.parse(localStorage.getItem('c2e_user') || 'null'); } catch { return null; }
  }
  get role(): string { return (this.user?.role || '').toUpperCase(); }
  get loggedIn(): boolean { return !!this.token; }

  login(email: string, password: string) {
    return this.api.post('/auth/login', { email, password }, { direct: true }).pipe(
      tap((r: any) => {
        const t = r.token || r.data?.token;
        const u = r.user || r.data?.user;
        if (t) localStorage.setItem('c2e_token', t);
        if (u) localStorage.setItem('c2e_user', JSON.stringify(u));
      })
    );
  }
  register(name: string, email: string, password: string, role: string) {
    return this.api.post('/auth/register', { name, email, password, role }, { direct: true }).pipe(
      tap((r: any) => {
        const t = r.token || r.data?.token;
        const u = r.user || r.data?.user;
        if (t) localStorage.setItem('c2e_token', t);
        if (u) localStorage.setItem('c2e_user', JSON.stringify(u));
      })
    );
  }
  logout() {
    localStorage.removeItem('c2e_token');
    localStorage.removeItem('c2e_user');
    this.router.navigate(['/login']);
  }
  redirectByRole() {
    const r = this.role;
    if (r === 'IMPORTER') this.router.navigate(['/dashboard']);
    else this.router.navigate(['/dashboard']);
  }
}
