import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { TimelineComponent } from '../shared/timeline.component';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-trace',
  standalone: true,
  imports: [CommonModule, RouterLink, TimelineComponent, StatusBadgeComponent],
  template: `
  <div class="max-w-3xl mx-auto">
    <div class="flex items-center gap-3 mb-4"><a routerLink="/" class="text-sm font-bold text-ocean-dark">← Home</a>
      <a routerLink="/dashboard" class="text-sm font-bold text-ocean-dark">Dashboard</a></div>
    <div *ngIf="loading" class="card"><span class="spinner"></span> Resolving {{ code }} from live API…</div>
    <div *ngIf="!loading && !data" class="card text-center py-10">
      <div class="text-slate-300" aria-hidden="true"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></div><h1 class="font-extrabold text-navy mt-2">No trace found for {{ code }}</h1>
      <p class="text-sm text-slate-500">Fetched GET /api/traceability/{{ code }} — check the code or scan another QR.</p></div>
    <div *ngIf="data" class="space-y-4">
      <div class="card text-center">
        <div class="text-xs font-bold tracking-widest text-slate-500">QR PROVENANCE • {{ code }}</div>
        <h1 class="text-2xl font-extrabold text-navy mt-1">{{ title }}</h1>
        <div class="text-sm text-slate-500">{{ subtitle }}</div>
        <div class="mt-2"><app-status-badge [status]="status"></app-status-badge></div>
        <img [src]="qr" class="w-32 h-32 mx-auto mt-3 border rounded-xl" alt="QR" />
      </div>
      <div class="card"><h3 class="font-bold text-navy mb-3">Journey timeline (live, backward-resolved)</h3>
        <app-timeline [steps]="steps"></app-timeline></div>
      <div class="card"><h3 class="font-bold text-navy mb-2">Raw JSON (auditable)</h3>
        <pre class="text-[11px] bg-slate-900 text-emerald-200 rounded-xl p-4 overflow-x-auto max-h-96 overflow-y-auto">{{ data | json }}</pre></div>
    </div>
  </div>`
})
export class TraceComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  code = ''; loading = true; data: any = null;
  steps: any[] = []; title = ''; subtitle = ''; status = ''; qr = '';
  ngOnInit() {
    this.code = this.route.snapshot.paramMap.get('code') || '';
    this.qr = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(location.href)}`;
    const tryPaths = [`/traceability/${this.code}`, `/traceability/package/${this.code}`, `/traceability/search?q=${this.code}`];
    const attempt = (i: number) => {
      if (i >= tryPaths.length) { this.loading = false; return; }
      this.api.get(tryPaths[i]).subscribe({
        next: (d: any) => {
          const x = d?.data ?? d;
          if (x && (x.exportGroup || x.export_group || x.sources || x.timeline || x.code || this.code)) { this.bind(x); this.loading = false; }
          else attempt(i + 1);
        },
        error: () => attempt(i + 1)
      });
    };
    attempt(0);
  }
  bind(x: any) {
    this.data = x;
    const eg = x.exportGroup || x.export_group || {};
    this.title = eg.code || x.export_group_code || x.code || this.code;
    this.subtitle = `${x.species || eg.species || ''} • ${x.total_quantity || eg.total_quantity || eg.quantity || ''} kg`;
    this.status = x.shipment?.status || eg.status || x.status || 'TRACEABLE';
    const tl = x.timeline || x.steps || [];
    if (Array.isArray(tl) && tl.length) {
      this.steps = tl.map((t: any) => ({ title: String(t.title || t.stage || t.label || '').toUpperCase(), sub: t.sub || t.description || t.code || '', detail: t.detail || t.date || '', color: '#00B4D8' }));
    } else {
      const S = (t: string, s: any, c: string) => ({ title: t, sub: s || '', color: c });
      this.steps = [
        S('RAW BATCH CREATED', src(x, ['raw_batch', 'rawBatch', 'batch_code']), '#0A2540'),
        S('PROCESSING', src(x, ['processing_group', 'processingGroup']), '#F59E0B'),
        S('QUALITY INSPECTION', x.quality?.score ? `Score ${x.quality.score}/10` : src(x, ['quality']), '#8B5CF6'),
        S('INVENTORY', src(x, ['inventory']), '#00B4D8'),
        S('COLD STORAGE', src(x, ['storage']), '#0EA5E9'),
        S('EXPORT GROUP', this.title, '#6366F1'),
        S('PACKED', src(x, ['packages']), '#4F46E5'),
        S('SHIPMENT', x.shipment ? `${x.shipment.origin || ''} → ${x.shipment.destination || ''} • ${x.shipment.status || ''}` : '', '#059669'),
      ].filter((s) => s.sub !== undefined);
    }
  }
}
function src(x: any, keys: string[]): string {
  for (const k of keys) { const v = (x as any)[k]; if (v) return typeof v === 'string' ? v : JSON.stringify(v).slice(0, 120); }
  const sources = (x as any).sources;
  if (Array.isArray(sources) && sources.length) return sources.map((s: any) => `${s.inventoryGroup || s.inventory_group || ''} ${s.quantity || ''}kg`).join(', ').slice(0, 160);
  return '';
}
