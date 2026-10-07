import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-quality',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent],
  template: `
  <h1 class="text-2xl font-extrabold text-navy mb-1">Quality Inspections</h1>
  <p class="text-sm text-slate-500 mb-4">7 parameters → live score preview → splits editor. Threshold default 6 (USABLE ≥ 6).</p>
  <div class="grid lg:grid-cols-2 gap-4">
    <div class="card">
      <h3 class="font-bold text-navy mb-2">Pending processing groups</h3>
      <div *ngFor="let g of pending" class="flex items-center gap-2 text-sm py-2 border-b border-slate-100">
        <span class="font-bold">{{ g.processing_group_code || g.code }}</span><span>{{ g.quantity }} kg</span>
        <app-status-badge [status]="g.status || 'WAITING_FOR_QUALITY'"></app-status-badge>
        <button (click)="sel = g; resetSplits()" class="ml-auto text-ocean-dark font-bold">Inspect</button>
      </div>
      <div *ngIf="!pending.length" class="text-sm text-slate-400">Nothing pending. Complete a processing record first.</div>
    </div>
    <div class="card">
      <h3 class="font-bold text-navy">Inspect {{ sel ? (sel.processing_group_code || sel.code) : '(select a group)' }}</h3>
      <div class="grid grid-cols-2 gap-3 mt-3" *ngIf="sel">
        <div *ngFor="let p of params">
          <label class="label">{{ p.label }} (max {{ p.max }})</label>
          <input type="range" [min]="0" [max]="p.max" step="0.5" [(ngModel)]="p.v" />
          <div class="text-xs font-bold">{{ p.v }} / {{ p.max }}</div>
        </div>
        <div class="col-span-2"><label class="label">Temperature °C</label><input class="input" [(ngModel)]="temperature" placeholder="-18" /></div>
        <div class="col-span-2"><label class="label">Remarks</label><input class="input" [(ngModel)]="remarks" /></div>
      </div>
      <div *ngIf="sel" class="mt-4 rounded-xl p-4 text-center border" [ngClass]="score() >= threshold ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'">
        <div class="text-4xl font-extrabold" [ngClass]="score() >= threshold ? 'text-emerald-600' : 'text-rose-600'">{{ score().toFixed(1) }} / 10</div>
        <div class="font-bold text-sm mt-1">{{ score() >= threshold ? 'USABLE' : 'NON-USABLE' }}</div>
      </div>
      <div *ngIf="sel" class="mt-3">
        <div class="text-xs font-bold text-slate-500 mb-1">SPLITS EDITOR (quantities must sum to {{ sel.quantity }} kg)</div>
        <div *ngFor="let s of splits; let i = index" class="flex gap-2 mb-2">
          <input class="input" type="number" [(ngModel)]="s.quantity" placeholder="kg" />
          <input class="input" type="number" [(ngModel)]="s.score" placeholder="score 0-10" min="0" max="10" />
          <button (click)="splits.splice(i,1)" class="btn-outline">✕</button>
        </div>
        <button (click)="splits.push({quantity: 0, score: score()})" class="btn-outline text-xs">+ Add split</button>
        <div class="text-xs mt-1" [ngClass]="splitSum() === +sel.quantity ? 'text-emerald-600 font-bold' : 'text-rose-600'">Split total: {{ splitSum() }} / {{ sel.quantity }} kg</div>
        <label class="label mt-2">Usable threshold (admin setting)</label>
        <input class="input !w-32" type="number" [(ngModel)]="threshold" min="0" max="10" />
        <button (click)="submit()" class="btn-ocean mt-3 w-full">Submit inspection</button>
        <div *ngIf="msg" class="text-sm mt-2 text-slate-600">{{ msg }}</div>
      </div>
    </div>
  </div>`
})
export class QualityComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  pending: any[] = []; sel: any = null; msg = '';
  temperature = '-18'; remarks = ''; threshold = 6;
  params = [
    { key: 'appearance', label: 'Appearance', max: 2, v: 2 },
    { key: 'odour', label: 'Odour', max: 2, v: 2 },
    { key: 'texture', label: 'Texture', max: 2, v: 1.5 },
    { key: 'size', label: 'Size consistency', max: 2, v: 1.5 },
    { key: 'processing', label: 'Processing', max: 1, v: 1 },
    { key: 'packaging', label: 'Packaging', max: 1, v: 1 },
  ];
  splits: any[] = [];
  ngOnInit() {
    this.api.get('/quality/pending').subscribe({
      next: (d: any) => { this.pending = d?.data ?? d?.rows ?? d ?? []; },
      error: () => { this.api.get('/processing-groups').subscribe({ next: (d: any) => { this.pending = (d?.data ?? d ?? []).filter((g: any) => String(g.status || '').toUpperCase().includes('QUALITY') || String(g.status || '').toUpperCase().includes('WAIT')); } }); }
    });
  }
  score() { return Math.min(10, this.params.reduce((a, p) => a + (+p.v || 0), 0) + 0); }
  splitSum() { return this.splits.reduce((a, s) => a + (+s.quantity || 0), 0); }
  resetSplits() {
    const q = +this.sel.quantity || 0;
    this.splits = q ? [{ quantity: q, score: this.score() }] : [];
  }
  submit() {
    if (!this.sel) return;
    const gid = this.sel.processing_group_id || this.sel.id || this.sel.processing_group_code;
    const body = {
      processing_group_id: gid, temperature: this.temperature, remarks: this.remarks,
      appearance_score: this.params[0].v, odour_score: this.params[1].v, texture_score: this.params[2].v,
      size_score: this.params[3].v, processing_score: this.params[4].v, packaging_score: this.params[5].v,
      quality_score: this.score(), splits: this.splits, results: this.splits
    };
    this.api.post('/quality/inspections', body).subscribe({
      next: (d: any) => {
        const inspId = d?.data?.inspection_id || d?.inspection_id || d?.data?.id;
        if (inspId && this.splits.length) {
          this.api.post(`/quality/inspections/${inspId}/results`, { splits: this.splits, results: this.splits }).subscribe({ next: () => {}, error: () => {} });
        }
        this.msg = 'Inspection submitted. Score ' + this.score().toFixed(1);
        this.toast.ok('Quality inspection completed');
      },
      error: (e) => { this.msg = e?.error?.message || 'Submit failed'; }
    });
  }
}
