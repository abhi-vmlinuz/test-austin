import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-processing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent],
  template: `
  <h1 class="text-2xl font-extrabold text-navy mb-1">Processing</h1>
  <p class="text-sm text-slate-500 mb-4">Incoming raw batches → start → complete. Rule: input = output + waste.</p>
  <div class="grid lg:grid-cols-2 gap-4">
    <div class="card">
      <h3 class="font-bold text-navy mb-2">Incoming raw batches</h3>
      <div *ngFor="let b of batches" class="flex items-center gap-2 text-sm py-2 border-b border-slate-100">
        <span class="font-bold">{{ b.batch_code || b.code }}</span><span>{{ b.species }}</span>
        <app-status-badge [status]="b.status"></app-status-badge>
        <button (click)="sel = b" class="ml-auto text-ocean-dark font-bold">Select</button>
      </div>
      <div *ngIf="!batches.length" class="text-sm text-slate-400">No batches available.</div>
    </div>
    <div class="card">
      <h3 class="font-bold text-navy mb-3">Start / complete processing {{ sel ? '— ' + (sel.batch_code || sel.code) : '' }}</h3>
      <div class="space-y-3">
        <div><label class="label">Processing type</label><input class="input" [(ngModel)]="m.processing_type" placeholder="Cleaning + De-heading + Peeling + Freezing" /></div>
        <div class="grid grid-cols-3 gap-2">
          <div><label class="label">Input kg</label><input class="input" type="number" [(ngModel)]="m.input_quantity" /></div>
          <div><label class="label">Output kg</label><input class="input" type="number" [(ngModel)]="m.output_quantity" /></div>
          <div><label class="label">Waste kg</label><input class="input" type="number" [(ngModel)]="m.waste_quantity" /></div>
        </div>
        <div *ngIf="mismatch() !== null" class="text-sm rounded-lg px-3 py-2 border"
          [ngClass]="mismatch() === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'">
          <span *ngIf="mismatch() === 0">✓ Balanced: input = output + waste</span>
          <span *ngIf="mismatch() !== 0">Processing quantity mismatch. Input: {{ m.input_quantity }} kg, Output + Waste: {{ (+m.output_quantity||0)+(+m.waste_quantity||0) }} kg, Difference: {{ mismatch() }} kg</span>
        </div>
        <div><label class="label">Remarks</label><input class="input" [(ngModel)]="m.remarks" /></div>
        <div class="flex gap-2">
          <button (click)="start()" class="btn-primary">Start processing</button>
          <button (click)="complete()" class="btn-ocean">Complete → PG</button>
        </div>
        <div *ngIf="msg" class="text-sm text-slate-600">{{ msg }}</div>
      </div>
    </div>
  </div>
  <div class="card mt-4"><h3 class="font-bold text-navy mb-2">Processing groups</h3>
    <div class="table-wrap !border-0 !shadow-none"><table class="data"><thead><tr><th>Code</th><th>Species</th><th>Qty</th><th>Status</th><th></th></tr></thead>
    <tbody><tr *ngFor="let g of groups"><td class="font-bold">{{ g.processing_group_code || g.code }}</td><td>{{ g.species }}</td><td>{{ g.quantity }} kg</td>
    <td><app-status-badge [status]="g.status"></app-status-badge></td>
    <td><a [routerLink]="['/processing-groups', gid(g)]" class="text-ocean-dark font-bold">Open →</a></td></tr></tbody></table></div></div>`
})
export class ProcessingComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  batches: any[] = []; groups: any[] = []; sel: any = null; msg = '';
  m: any = { processing_type: 'Cleaning + De-heading + Peeling + Freezing', input_quantity: 800, output_quantity: 760, waste_quantity: 40, remarks: '' };
  ngOnInit() {
    this.api.get('/raw-batches').subscribe({ next: (d: any) => { this.batches = (d?.data ?? d?.rows ?? d ?? []).filter((b: any) => ['AVAILABLE', 'CREATED'].includes(String(b.status).toUpperCase())); }, error: () => {} });
    this.api.get('/processing-groups').subscribe({ next: (d: any) => { this.groups = d?.data ?? d?.rows ?? d ?? []; }, error: () => {} });
  }
  gid(g: any) { return g.processing_group_id || g.id || g.processing_group_code; }
  mismatch(): number | null {
    if (this.m.input_quantity === '' || this.m.input_quantity == null) return null;
    return +this.m.input_quantity - ((+this.m.output_quantity || 0) + (+this.m.waste_quantity || 0));
  }
  start() {
    if (!this.sel) { this.msg = 'Select an incoming raw batch first.'; return; }
    if (this.mismatch() !== 0) { this.msg = 'Blocked: input must equal output + waste.'; return; }
    const id = this.sel.raw_batch_id || this.sel.id || this.sel.batch_code;
    this.api.post('/processing', { raw_batch_id: id, ...this.m }).subscribe({
      next: (d: any) => { this.msg = 'Processing started: ' + JSON.stringify(d?.data?.processing_id || d?.processing_id || 'ok'); this.toast.ok('Processing started'); },
      error: (e) => { this.msg = e?.error?.message || 'Start failed'; }
    });
  }
  complete() {
    if (this.mismatch() !== 0) { this.msg = 'Blocked: input must equal output + waste.'; return; }
    this.api.post('/processing', { raw_batch_id: this.sel ? (this.sel.raw_batch_id || this.sel.id || this.sel.batch_code) : undefined, ...this.m, complete: true }).subscribe({
      next: (d: any) => {
        const pid = d?.data?.processing_id || d?.processing_id || d?.data?.id;
        if (pid) this.api.post(`/processing/${pid}/complete`, {}).subscribe({ next: () => this.toast.ok('Processing group created'), error: () => this.toast.ok('Processing saved') });
        else this.toast.ok('Processing saved');
      },
      error: (e) => { this.msg = e?.error?.message || 'Complete failed'; }
    });
  }
}
