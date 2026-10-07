import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-shipments',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent],
  template: `
  <h1 class="text-2xl font-extrabold text-navy mb-4">Shipments</h1>
  <div class="grid lg:grid-cols-3 gap-4">
    <div class="card lg:col-span-2">
      <h3 class="font-bold text-navy mb-2">All shipments + status tracker</h3>
      <div *ngFor="let s of rows" class="border-b border-slate-100 py-3">
        <div class="flex items-center gap-2 text-sm"><b class="text-navy">{{ s.tracking_number || ('SHIP-' + (s.shipment_id || s.id)) }}</b>
          <span>{{ s.origin }} → {{ s.destination }} • {{ s.shipping_method }}</span>
          <app-status-badge [status]="s.status" class="ml-auto"></app-status-badge></div>
        <div class="flex items-center gap-1 mt-2 text-[10px] font-bold">
          <span *ngFor="let st of stages; let i = index" class="flex items-center gap-1">
            <span class="px-2 py-1 rounded-full" [ngClass]="stageIdx(s.status) >= i ? 'bg-navy text-white' : 'bg-slate-100 text-slate-400'">{{ st }}</span>
            <span *ngIf="i < stages.length - 1">→</span></span>
          <button (click)="advance(s)" class="ml-2 text-ocean-dark">Advance →</button>
        </div>
      </div>
      <div *ngIf="!rows.length" class="text-sm text-slate-400 py-6 text-center">No shipments yet.</div>
    </div>
    <div class="card"><h3 class="font-bold text-navy mb-3">Create shipment (AIR / SEA)</h3>
      <div class="space-y-2">
        <div><label class="label">Export group id/code</label><input class="input" [(ngModel)]="m.export_group_id" /></div>
        <div><label class="label">Method</label><select class="input" [(ngModel)]="m.shipping_method"><option>SEA</option><option>AIR</option></select></div>
        <div><label class="label">Carrier</label><input class="input" [(ngModel)]="m.carrier" placeholder="Maersk" /></div>
        <div><label class="label">Origin → Destination</label><div class="flex gap-2"><input class="input" [(ngModel)]="m.origin" placeholder="Kochi" /><input class="input" [(ngModel)]="m.destination" placeholder="Hamburg" /></div></div>
        <div><label class="label">Departure</label><input class="input" type="date" [(ngModel)]="m.departure_date" /></div>
        <div *ngIf="warn" class="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">⚠ {{ warn }} (shipping rule check)</div>
        <button (click)="create()" class="btn-ocean w-full">Create shipment</button>
      </div></div>
  </div>`
})
export class ShipmentsComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  rows: any[] = []; stages = ['READY', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED'];
  m: any = { shipping_method: 'SEA', origin: 'Kochi', destination: 'Hamburg' };
  warn = '';
  ngOnInit() { this.load(); }
  load() { this.api.get('/shipments').subscribe({ next: (d: any) => { this.rows = d?.data ?? d?.rows ?? d ?? []; }, error: () => {} }); }
  stageIdx(s: string) { return Math.max(0, this.stages.indexOf(String(s || 'READY').toUpperCase())); }
  create() {
    this.warn = '';
    this.api.post('/shipments', { ...this.m, tracking_number: this.m.tracking_number || `TRK-${Date.now().toString().slice(-6)}` }).subscribe({
      next: () => { this.toast.ok('Shipment created'); this.load(); },
      error: (e) => {
        const msg = e?.error?.message || 'Create failed';
        if (/rule|not allowed|shipping/i.test(msg)) this.warn = msg;
        else this.toast.err(msg);
      }
    });
  }
  advance(s: any) {
    const i = this.stageIdx(s.status);
    const next = this.stages[Math.min(this.stages.length - 1, i + 1)];
    if (!confirm(`Move to ${next}?`)) return;
    const id = s.shipment_id || s.id;
    this.api.put(`/shipments/${id}/status`, { status: next }).subscribe({ next: () => { this.toast.ok('Shipment → ' + next); this.load(); }, error: (e) => this.toast.err(e?.error?.message || 'Failed') });
  }
}
