import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent],
  template: `
  <a routerLink="/orders" class="text-sm text-ocean-dark font-bold">← Orders</a>
  <div *ngIf="o" class="card mt-3">
    <div class="flex flex-wrap items-start gap-3">
      <div class="flex-1"><h1 class="text-2xl font-extrabold text-navy">{{ o.order_code || ('ORD-' + (o.order_id || o.id)) }}</h1>
      <div class="text-sm text-slate-500">{{ o.destination_country || o.destination }} • {{ o.shipping_method }} • Required {{ o.required_date || '' }}</div>
      <div class="mt-2"><app-status-badge [status]="o.status"></app-status-badge></div></div>
      <div class="flex flex-wrap gap-2">
        <button (click)="setStatus('ACCEPTED')" class="btn-primary !py-2">Accept</button>
        <button (click)="setStatus('REJECTED')" class="btn-outline !py-2" (dblclick)="setStatus('REJECTED')">Reject</button>
        <button (click)="validate()" class="btn-outline !py-2">Validate</button>
        <button (click)="allocate()" class="btn-ocean !py-2">🧠 Smart Allocate</button>
      </div>
    </div>
    <div class="mt-3 text-sm"><b>Items:</b><div *ngFor="let it of items" class="text-slate-600">{{ it.species }} → {{ it.required_quantity }} kg → min score {{ it.minimum_quality_score }}</div></div>
    <div *ngIf="validation" class="mt-3 text-sm rounded-lg border px-3 py-2" [ngClass]="validation.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'">{{ validation.msg }}</div>
    <div *ngIf="alloc" class="mt-3 text-sm rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
      <b>Allocation result:</b> {{ allocMsg }}<div *ngFor="let a of allocLines">{{ a }}</div>
      <a *ngIf="exportLink" [routerLink]="exportLink" class="text-indigo-700 font-bold">Open export group →</a>
    </div>
  </div>`
})
export class OrderDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  o: any = null; items: any[] = []; validation: any = null; alloc: any = null; allocMsg = ''; allocLines: string[] = []; exportLink: any = null;
  id() { return this.route.snapshot.paramMap.get('id'); }
  ngOnInit() { this.load(); }
  load() {
    this.api.get(`/orders/${this.id()}`).subscribe({ next: (d: any) => { this.o = d?.data ?? d; this.items = this.o?.items || this.o?.order_items || []; }, error: () => {} });
  }
  setStatus(s: string) {
    if (s === 'REJECTED' && !confirm('Reject this order?')) return;
    this.api.put(`/orders/${this.id()}/status`, { status: s }).subscribe({ next: () => { this.toast.ok('Order ' + s.toLowerCase()); this.load(); }, error: (e) => this.toast.err(e?.error?.message || 'Failed') });
  }
  validate() {
    this.api.post(`/orders/${this.id()}/validate`, {}).subscribe({
      next: (d: any) => { const x = d?.data ?? d; this.validation = { ok: x?.ok !== false && !x?.shortage, msg: x?.message || JSON.stringify(x).slice(0, 300) }; },
      error: (e) => { this.validation = { ok: false, msg: e?.error?.message || 'Validation failed' }; }
    });
  }
  allocate() {
    this.api.post(`/orders/${this.id()}/allocate`, {}).subscribe({
      next: (d: any) => {
        const x = d?.data ?? d; this.alloc = x;
        if (x?.shortage || x?.insufficient) { this.allocMsg = `Insufficient inventory. Required ${x.required}, available ${x.available}, shortage ${x.shortage}`; }
        else {
          const lines = x?.allocations || x?.lines || [];
          this.allocLines = lines.map((l: any) => `${l.inventory_group_code || l.inventoryGroup || l.code} → ${l.allocated_quantity || l.quantity} kg`);
          this.allocMsg = x?.message || 'Allocated successfully. Export group created.';
          const eg = x?.export_group_id || x?.exportGroupId || x?.export_group_code;
          if (eg) this.exportLink = ['/export-groups', eg];
          this.toast.ok('Smart allocation done');
        }
      },
      error: (e) => { this.alloc = {}; this.allocMsg = e?.error?.message || 'Allocation failed: insufficient inventory'; }
    });
  }
}
