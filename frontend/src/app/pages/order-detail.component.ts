import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { AuthService } from '../core/auth.service';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent],
  template: `
  <div class="mo-wrap">
    <a routerLink="/orders" class="text-sm font-bold" style="color:#2173B5;">← Orders</a>
    <div *ngIf="o" class="mo-card" style="margin-top:.75rem;">
      <div class="mo-topline"><div class="mo-code">IMPORTER ORDER</div><span class="mo-brand">MARINE ORIGIN</span></div>
      <h1 class="mo-title" style="margin-top:.25rem;">{{ o.order_code || ('ORD-' + (o.order_id || o.id)) }}</h1>
      <div class="mo-sub">{{ o.destination_country || o.destination }} • {{ o.shipping_method }} • Required {{ o.required_date || '' }}</div>
      <div class="mt-2"><app-status-badge [status]="o.status"></app-status-badge></div>
      <div class="mt-3 text-sm"><b>Items:</b><div *ngFor="let it of items" class="text-slate-600">{{ it.species }} → {{ it.required_quantity }} kg → min score {{ it.minimum_quality_score }}</div></div>
      <div *ngIf="canManage()" style="margin-top:1rem;">
        <button (click)="setStatus('ACCEPTED')" class="mo-cta" style="margin-top:0;">Accept order</button>
        <button (click)="setStatus('REJECTED')" class="mo-ghost">Reject</button>
      </div>
      <div class="mo-row" style="margin-top:.8rem;">
        <button (click)="validate()" class="mo-pill mo-aqua" style="border:0;flex:1;">Validate</button>
        <button *ngIf="canManage()" (click)="allocate()" class="mo-pill mo-cyan" style="border:0;flex:1;">Smart Allocate</button>
      </div>
      <div *ngIf="validation" class="mo-note rounded-2xl border px-3 py-2" [ngClass]="validation.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'">{{ validation.msg }}</div>
      <div *ngIf="alloc" class="mt-3 text-sm rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-2">
        <b>Allocation result:</b> {{ allocMsg }}<div *ngFor="let a of allocLines">{{ a }}</div>
        <a *ngIf="exportLink && canManage()" [routerLink]="exportLink" class="text-indigo-700 font-bold">Open export group →</a>
      </div>
    </div>
  </div>`
})
export class OrderDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  auth = inject(AuthService);
  o: any = null; items: any[] = []; validation: any = null; alloc: any = null; allocMsg = ''; allocLines: string[] = []; exportLink: any = null;
  canManage() { return this.auth.role === 'ADMIN' || this.auth.role === 'EXPORTER'; }
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
