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
  <div class="mo-wrap">
    <div class="mo-head">
      <div class="mo-topline"><h1 class="mo-title">{{ sel ? 'Quality Inspection' : 'Inspections' }}</h1><span class="mo-brand">MARINE ORIGIN</span></div>
      <div class="mo-sub">{{ sel ? (sel.processing_group_code || sel.code) : 'Quality Inspector' }}</div>
    </div>

    <div *ngIf="!sel">
      <div class="mo-countrow"><span class="mo-pill mo-cyan">Pending {{ pending.length }}</span></div>
      <div class="mo-stack">
        <div *ngFor="let g of pending" class="mo-card mo-row">
          <div class="flex-1 min-w-0">
            <div class="mo-code">{{ g.processing_group_code || g.code }}</div>
            <div class="mo-name" style="font-size:1.55rem;">{{ g.species || 'Batch' }}</div>
            <div class="mo-qty">{{ fmtQty(g.quantity) }} kg</div>
          </div>
          <button (click)="sel = g; resetSplits()" class="mo-link">Inspect →</button>
        </div>
        <div *ngIf="!pending.length" class="mo-card text-center text-sm" style="color:#5B6B7E;">Nothing pending. Complete a processing record first.</div>
      </div>
    </div>

    <div *ngIf="sel">
      <button (click)="sel = null" class="text-sm font-bold" style="color:#2173B5;">← Inspection queue</button>
      <div class="mo-name" style="margin-top:.6rem;">{{ sel.species || 'Batch' }} · {{ fmtQty(sel.quantity) }} kg</div>
      <div class="mo-label" style="margin-top:1.4rem;">Quality grade</div>
      <div class="mo-score">{{ score().toFixed(1) }}<small> /10</small></div>
      <div class="mo-bar"><i [style.width.%]="score() * 10"></i></div>
      <div class="mo-countrow" style="margin-top:1rem;margin-bottom:0;">
        <span class="mo-pill" [ngClass]="gradeClass(score())">{{ gradeLabel(score()) }}</span>
      </div>

      <h2 class="mo-sec">Inspection notes</h2>
      <div class="mo-card">
        <div class="grid grid-cols-2 gap-3">
          <div *ngFor="let p of params">
            <label class="mo-label" style="margin-top:0;font-size:.95rem;">{{ p.label }} (max {{ p.max }})</label>
            <input type="range" [min]="0" [max]="p.max" step="0.5" [(ngModel)]="p.v" />
            <div class="text-xs font-bold">{{ p.v }} / {{ p.max }}</div>
          </div>
        </div>
        <div><label class="mo-label">Temperature °C</label><input class="mo-input" [(ngModel)]="temperature" placeholder="-18" /></div>
        <div><label class="mo-label">Remarks</label><input class="mo-input" [(ngModel)]="remarks" placeholder="Excellent freshness. Firm texture." /></div>
      </div>

      <div style="margin-top:1rem;">
        <div class="text-xs font-bold tracking-widest" style="color:#5B6B7E;">SPLITS EDITOR (quantities must sum to {{ sel.quantity }} kg)</div>
        <div *ngFor="let s of splits; let i = index" class="mo-row" style="margin-top:.6rem;">
          <input class="mo-input" type="number" [(ngModel)]="s.quantity" placeholder="kg" />
          <input class="mo-input" type="number" [(ngModel)]="s.score" placeholder="score 0-10" min="0" max="10" />
          <button (click)="splits.splice(i,1)" class="mo-ghost" style="width:auto;margin-top:0;padding:.6rem 1rem;">✕</button>
        </div>
        <button (click)="splits.push({quantity: 0, score: score()})" class="mo-ghost" style="font-size:1rem;">+ Add split</button>
        <div class="text-sm mt-1 font-bold" [ngClass]="splitSum() === +sel.quantity ? 'text-emerald-600' : 'text-rose-600'">Split total: {{ splitSum() }} / {{ sel.quantity }} kg</div>
        <div><label class="mo-label">Usable threshold (admin setting)</label><input class="mo-input" style="max-width:10rem;" type="number" [(ngModel)]="threshold" min="0" max="10" /></div>
        <div *ngIf="msg" class="mo-note">{{ msg }}</div>
      </div>

      <button (click)="submit()" class="mo-cta">Confirm grade</button>
      <div class="mo-legend">
        <div>9–10 → Premium Export</div>
        <div>8–9 → Export Ready</div>
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
  fmtQty(q: any) { return (+q || 0).toLocaleString('en-IN'); }
  score() { return Math.min(10, this.params.reduce((a, p) => a + (+p.v || 0), 0) + 0); }
  gradeLabel(s: number) {
    if (s >= 9) return 'PREMIUM EXPORT';
    if (s >= 8) return 'EXPORT READY';
    if (s >= 6) return 'USABLE';
    return 'NON-USABLE';
  }
  gradeClass(s: number) {
    if (s >= 9) return 'mo-mint';
    if (s >= 8) return 'mo-sky';
    if (s >= 6) return 'mo-aqua';
    return 'mo-rose';
  }
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
        this.msg = 'Inspection recorded. Score ' + this.score().toFixed(1);
        this.toast.ok('Inspection recorded');
      },
      error: (e) => { this.msg = e?.error?.message || 'Submit failed'; }
    });
  }
}
