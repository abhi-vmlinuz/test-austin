import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent],
  template: `
  <h1 class="text-2xl font-extrabold text-navy">{{ auth.role || 'DASHBOARD' }} Dashboard</h1>
  <p class="text-sm text-slate-500 mb-4">Welcome, {{ auth.user?.name }}. Live data from /api/reports/dashboard.</p>
  <div *ngIf="loading" class="card"><span class="spinner"></span> Loading…</div>
  <div *ngIf="!loading">
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="card" *ngFor="let c of visibleCards()"><div class="text-xs font-bold text-slate-500 uppercase">{{ c.label }}</div>
        <div class="text-2xl font-extrabold text-navy mt-1">{{ c.value }}</div></div>
    </div>
    <div class="grid lg:grid-cols-2 gap-4 mt-4">
      <div class="card" *ngIf="showSpecies()"><h3 class="font-bold text-navy mb-3">Inventory by species (kg)</h3>
        <div *ngFor="let r of species" class="mb-2"><div class="flex justify-between text-xs"><span>{{ r.label }}</span><b>{{ r.value }}</b></div>
        <div class="h-2 bg-slate-100 rounded-full"><div class="h-2 bg-ocean rounded-full" [style.width.%]="pct(r.value)"></div></div></div>
        <div *ngIf="!species.length" class="text-sm text-slate-400">No data yet.</div></div>
      <div class="card" *ngIf="showOrders()"><h3 class="font-bold text-navy mb-3">Order status</h3>
        <div *ngFor="let r of orders" class="flex items-center justify-between text-sm py-1.5 border-b border-slate-100">
          <app-status-badge [status]="r.label"></app-status-badge><b>{{ r.value }}</b></div>
        <div *ngIf="!orders.length" class="text-sm text-slate-400">No orders yet. <a *ngIf="canCreateOrder()" routerLink="/orders/create" class="text-ocean-dark font-bold">Create one →</a></div></div>
    </div>
    <div class="card mt-4"><h3 class="font-bold text-navy mb-2">Next actions</h3>
      <div class="text-sm text-slate-600 space-y-1">
        <div *ngFor="let a of actions()"><span>{{ a.text }}</span> <a [routerLink]="a.path" class="text-ocean-dark font-bold">{{ a.link }}</a></div>
        <div *ngIf="!actions().length" class="text-slate-400">No pending actions. You're all caught up.</div>
      </div></div>
  </div>`
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  loading = true; cards: any[] = []; species: any[] = []; orders: any[] = [];
  ngOnInit() {
    this.api.get('/reports/dashboard').subscribe({
      next: (d: any) => {
        const x = d?.data ?? d ?? {};
        this.loading = false;
        const pick = (o: any, ...ks: string[]) => { for (const k of ks) if (o[k] !== undefined) return o[k]; return 0; };
        this.cards = [
          { label: 'Raw batches', value: pick(x, 'totalRawBatches', 'rawBatches', 'raw_batches'), roles: ['ADMIN', 'SOURCE_OPERATOR', 'PROCESSOR'] },
          { label: 'Processing', value: pick(x, 'processing', 'activeProcessing'), roles: ['ADMIN', 'PROCESSOR'] },
          { label: 'Pending inspections', value: pick(x, 'pendingInspections', 'pending_inspections'), roles: ['ADMIN', 'QUALITY_INSPECTOR', 'PROCESSOR'] },
          { label: 'Inventory kg', value: pick(x, 'currentInventory', 'inventoryKg', 'inventory_kg'), roles: ['ADMIN', 'PROCESSOR', 'EXPORTER'] },
          { label: 'Pending orders', value: pick(x, 'pendingOrders', 'pending_orders'), roles: ['ADMIN', 'EXPORTER', 'IMPORTER'] },
          { label: 'Export groups', value: pick(x, 'exportGroups', 'export_groups'), roles: ['ADMIN', 'EXPORTER'] },
          { label: 'In transit', value: pick(x, 'inTransit', 'in_transit', 'activeShipments'), roles: ['ADMIN', 'EXPORTER'] },
          { label: 'Delivered', value: pick(x, 'delivered', 'deliveredShipments'), roles: ['ADMIN', 'EXPORTER'] },
        ];
        const norm = (arr: any) => Array.isArray(arr) ? arr.map((r: any) => ({ label: r.label || r.species || r.status || r.name, value: r.value ?? r.quantity ?? r.count ?? 0 })) : [];
        this.species = norm(x.inventoryBySpecies || x.inventory_by_species || x.species);
        this.orders = norm(x.orderStatus || x.order_status || x.ordersByStatus);
        this.api.get(`/dashboard/${this.auth.role.toLowerCase()}`).subscribe({ next: () => {}, error: () => {} });
      },
      error: () => { this.loading = false; }
    });
  }
  role() { return this.auth.role || ''; }
  visibleCards() {
    const r = this.role();
    if (r === 'ADMIN') return this.cards;
    return this.cards.filter((c) => !c.roles || c.roles.includes(r));
  }
  showSpecies() { return ['ADMIN', 'PROCESSOR', 'EXPORTER'].includes(this.role()); }
  showOrders() { return ['ADMIN', 'EXPORTER', 'IMPORTER'].includes(this.role()); }
  canCreateOrder() { return ['ADMIN', 'IMPORTER'].includes(this.role()); }
  actions() {
    const r = this.role();
    const A: any[] = [];
    if (r === 'ADMIN') {
      A.push({ text: 'Review platform activity →', link: 'Admin', path: '/admin' });
      A.push({ text: 'Source operator creates a Raw Batch →', link: 'Create', path: '/raw-batches/create' });
      A.push({ text: 'Processor starts processing →', link: 'Processing', path: '/processing' });
      A.push({ text: 'Inspector scores the group →', link: 'Quality', path: '/quality' });
      A.push({ text: 'Exporter smart-allocates →', link: 'Orders', path: '/orders' });
    } else if (r === 'SOURCE_OPERATOR') {
      A.push({ text: 'Record a new landing →', link: 'Create raw batch', path: '/raw-batches/create' });
      A.push({ text: 'Review your batches →', link: 'Raw batches', path: '/raw-batches' });
    } else if (r === 'PROCESSOR') {
      A.push({ text: 'Pick up incoming requests →', link: 'Processing', path: '/processing' });
      A.push({ text: 'Check raw batch availability →', link: 'Raw batches', path: '/raw-batches' });
      A.push({ text: 'Review stock levels →', link: 'Reports', path: '/reports' });
    } else if (r === 'QUALITY_INSPECTOR') {
      A.push({ text: 'Inspect pending groups →', link: 'Quality', path: '/quality' });
    } else if (r === 'EXPORTER') {
      A.push({ text: 'Review importer orders →', link: 'Orders', path: '/orders' });
      A.push({ text: 'Manage export groups →', link: 'Export groups', path: '/export-groups' });
      A.push({ text: 'Check inventory →', link: 'Inventory', path: '/inventory' });
    } else if (r === 'IMPORTER') {
      A.push({ text: 'Place a new order →', link: 'Create order', path: '/orders/create' });
      A.push({ text: 'Track your orders →', link: 'Orders', path: '/orders' });
    }
    return A;
  }
  pct(v: number) { const m = Math.max(1, ...this.species.map((s) => +s.value || 0)); return Math.min(100, (+v / m) * 100); }
}
