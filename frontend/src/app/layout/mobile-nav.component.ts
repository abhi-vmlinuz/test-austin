import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';

interface Tab { label: string; path: string; roles: string[]; }

const TABS: Tab[] = [
  { label: 'Dashboard', path: '/dashboard', roles: [] },
  { label: 'Raw Batches', path: '/raw-batches', roles: ['ADMIN', 'SOURCE_OPERATOR', 'PROCESSOR'] },
  { label: 'Processing', path: '/processing', roles: ['ADMIN', 'PROCESSOR'] },
  { label: 'Quality', path: '/quality', roles: ['ADMIN', 'QUALITY_INSPECTOR'] },
  { label: 'Inventory', path: '/inventory', roles: ['ADMIN', 'PROCESSOR', 'EXPORTER'] },
  { label: 'Storage', path: '/storage', roles: ['ADMIN', 'PROCESSOR', 'EXPORTER'] },
  { label: 'Orders', path: '/orders', roles: ['ADMIN', 'EXPORTER', 'IMPORTER'] },
  { label: 'Export Groups', path: '/export-groups', roles: ['ADMIN', 'EXPORTER'] },
  { label: 'Shipments', path: '/shipments', roles: ['ADMIN', 'EXPORTER'] },
  { label: 'Reports', path: '/reports', roles: ['ADMIN', 'EXPORTER', 'PROCESSOR'] },
];

const ICONS: Record<string, string> = {
  home: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/></svg>',
  batches: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5" fill="currentColor" stroke="none"/></svg>',
  trace: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="8" r="2.5"/><path d="M6 8.5v7"/><path d="M8 7.5c4 0 3 4 7.5 3.4"/></svg>',
  profile: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="9.5" r="3"/><path d="M6 19c1.2-3 3.4-4.5 6-4.5s4.8 1.5 6 4.5"/></svg>',
};

@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  styles: [`
    .mo-tabbar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 40; background: #fff;
      border-top: 1px solid #E4E9F0; display: flex; justify-content: space-around;
      padding: .55rem .5rem calc(.55rem + env(safe-area-inset-bottom)); }
    .mo-tab { display: flex; flex-direction: column; align-items: center; gap: .15rem;
      color: #101828; font-size: .95rem; font-weight: 500; min-width: 4.2rem; text-decoration: none; background: none; border: 0; }
    .mo-ico { display: flex; align-items: center; justify-content: center; padding: .3rem 1.3rem; border-radius: 999px; color: #101828; }
    .mo-tab.active .mo-ico { background: #CCEBED; }
    .mo-tab.active { font-weight: 700; }
  `],
  template: `
  <nav class="mo-tabbar md:hidden">
    <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="mo-tab" aria-label="Home">
      <span class="mo-ico" [innerHTML]="icon('home')"></span><span>Home</span>
    </a>
    <a [routerLink]="batchesPath()" routerLinkActive="active" class="mo-tab" aria-label="Batches">
      <span class="mo-ico" [innerHTML]="icon('batches')"></span><span>Batches</span>
    </a>
    <button (click)="trace()" class="mo-tab" aria-label="Trace">
      <span class="mo-ico" [innerHTML]="icon('trace')"></span><span>Trace</span>
    </button>
    <a routerLink="/profile" routerLinkActive="active" class="mo-tab" aria-label="Profile">
      <span class="mo-ico" [innerHTML]="icon('profile')"></span><span>Profile</span>
    </a>
  </nav>`
})
export class MobileNavComponent {
  auth = inject(AuthService);
  private router = inject(Router);
  icon(k: string) { return ICONS[k]; }
  tabs(): Tab[] {
    const r = this.auth.role;
    const all = TABS.filter((t) => !t.roles.length || t.roles.includes(r) || r === 'ADMIN');
    const dash = all.filter((t) => t.path === '/dashboard');
    const rest = all.filter((t) => t.path !== '/dashboard').slice(0, 4);
    return [...dash, ...rest];
  }
  batchesPath(): string {
    const paths = this.tabs().map((t) => t.path).filter((p) => p !== '/dashboard');
    const pref = ['/raw-batches', '/processing', '/quality', '/inventory', '/storage', '/orders'];
    return pref.find((p) => paths.includes(p)) || '/dashboard';
  }
  trace() {
    const c = window.prompt('Enter batch / group / package code to trace:');
    if (c && c.trim()) this.router.navigate(['/traceability', c.trim()]);
  }
}
