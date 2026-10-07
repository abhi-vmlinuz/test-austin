import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/auth.service';
import { ApiService } from '../core/api.service';
import { StatusBadgeComponent } from '../shared/status-badge.component';

interface MenuItem { label: string; path: string; roles: string[]; }

const MENU: MenuItem[] = [
  { label: 'Dashboard', path: '/dashboard', roles: [] },
  { label: 'Raw Batches', path: '/raw-batches', roles: ['ADMIN', 'SOURCE_OPERATOR', 'PROCESSOR'] },
  { label: 'Processing', path: '/processing', roles: ['ADMIN', 'PROCESSOR'] },
  { label: 'Quality', path: '/quality', roles: ['ADMIN', 'QUALITY_INSPECTOR', 'PROCESSOR'] },
  { label: 'Inventory', path: '/inventory', roles: ['ADMIN', 'PROCESSOR', 'EXPORTER'] },
  { label: 'Storage', path: '/storage', roles: ['ADMIN', 'PROCESSOR'] },
  { label: 'Orders', path: '/orders', roles: ['ADMIN', 'EXPORTER', 'IMPORTER'] },
  { label: 'Export Groups', path: '/export-groups', roles: ['ADMIN', 'EXPORTER'] },
  { label: 'Shipments', path: '/shipments', roles: ['ADMIN', 'EXPORTER', 'IMPORTER'] },
  { label: 'Documents', path: '/documents', roles: ['ADMIN', 'EXPORTER'] },
  { label: 'Reports', path: '/reports', roles: ['ADMIN', 'EXPORTER', 'PROCESSOR'] },
  { label: 'Admin', path: '/admin', roles: ['ADMIN'] },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule, StatusBadgeComponent],
  template: `
  <div class="min-h-screen flex bg-slate-100">
    <aside class="w-60 shrink-0 bg-navy text-white hidden md:flex flex-col min-h-screen sticky top-0 h-screen">
      <a routerLink="/dashboard" class="flex items-center gap-2 px-5 py-5 border-b border-white/10">
        <span class="w-9 h-9 rounded-xl bg-ocean flex items-center justify-center text-xl">⚓</span>
        <span class="font-extrabold tracking-tight">Catch2Export</span>
      </a>
      <nav class="flex-1 overflow-y-auto p-3 space-y-1">
        <a *ngFor="let m of visibleMenu()" [routerLink]="m.path" routerLinkActive="!bg-white/15"
          class="block px-3.5 py-2.5 rounded-lg text-sm font-medium hover:bg-white/10 text-slate-100">{{ m.label }}</a>
        <a routerLink="/profile" routerLinkActive="!bg-white/15" class="block px-3.5 py-2.5 rounded-lg text-sm hover:bg-white/10">Profile</a>
      </nav>
      <div class="p-4 border-t border-white/10 text-xs text-slate-300">Every kilogram has<br/>a digital identity.</div>
    </aside>
    <div class="flex-1 min-w-0 flex flex-col">
      <header class="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div class="flex items-center gap-3 px-4 md:px-6 py-3">
          <span class="md:hidden font-extrabold text-navy">⚓ C2E</span>
          <div class="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 flex-1 max-w-xl">
            <span class="text-slate-400">🔍</span>
            <input [(ngModel)]="q" (keyup.enter)="search()" placeholder="Trace: RAW-SHR-001 · PG-001 · IG-001 · EXPORT-GROUP-001 · PKG-001"
              class="bg-transparent outline-none text-sm w-full" />
            <button (click)="search()" class="text-xs font-bold text-ocean-dark">GO</button>
          </div>
          <div class="ml-auto flex items-center gap-3">
            <button (click)="loadNotes()" class="relative text-xl" title="Notifications">🔔
              <span *ngIf="notes.length" class="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{{ notes.length }}</span>
            </button>
            <div class="text-right hidden sm:block">
              <div class="text-sm font-bold text-navy">{{ auth.user?.name || 'User' }}</div>
              <div class="text-[11px] text-slate-500">{{ auth.role }}</div>
            </div>
            <button (click)="auth.logout()" class="btn-outline !py-1.5 !px-3">Logout</button>
          </div>
        </div>
        <div *ngIf="showNotes" class="absolute right-4 top-14 w-80 card !p-3 z-50 max-h-80 overflow-y-auto">
          <div class="text-xs font-bold text-slate-500 px-1 pb-2">NOTIFICATIONS</div>
          <div *ngFor="let n of notes" class="text-xs px-2 py-2 border-b border-slate-100">{{ n }}</div>
          <div *ngIf="!notes.length" class="text-xs text-slate-400 px-2 py-2">No new notifications.</div>
        </div>
      </header>
      <main class="p-4 md:p-6 max-w-7xl w-full mx-auto"><router-outlet></router-outlet></main>
    </div>
  </div>`
})
export class ShellComponent {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);
  q = '';
  notes: string[] = [];
  showNotes = false;
  visibleMenu() {
    const r = this.auth.role;
    return MENU.filter((m) => !m.roles.length || m.roles.includes(r) || r === 'ADMIN');
  }
  search() {
    const c = this.q.trim();
    if (c) this.router.navigate(['/traceability', c]);
  }
  loadNotes() {
    this.showNotes = !this.showNotes;
    if (!this.showNotes) return;
    this.api.get('/reports/dashboard').subscribe({
      next: (d: any) => {
        const x = d?.data ?? d ?? {};
        this.notes = [
          `${x.pendingInspections ?? x.pending_inspections ?? 0} processing groups waiting for inspection`,
          `${x.pendingOrders ?? x.pending_orders ?? 0} new importer orders need review`,
          `${x.inTransit ?? x.in_transit ?? 0} shipments currently in transit`,
        ];
      },
      error: () => { this.notes = ['Traceability search ready. Enter any batch / group / package code above.']; }
    });
  }
}
