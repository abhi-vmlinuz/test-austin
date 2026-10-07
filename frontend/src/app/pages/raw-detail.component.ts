import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { StatusBadgeComponent } from '../shared/status-badge.component';
import { TimelineComponent, TlStep } from '../shared/timeline.component';

@Component({
  selector: 'app-raw-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent, TimelineComponent],
  template: `
  <div class="mo-wrap">
  <a routerLink="/raw-batches" class="text-sm font-bold" style="color:#2173B5;">← Raw batches</a>
  <div *ngIf="loading" class="mo-card" style="margin-top:.75rem;"><span class="spinner"></span> Loading…</div>
  <div *ngIf="!loading && b" class="mt-3 space-y-4">
    <div class="mo-card">
      <div class="mo-topline"><div class="mo-code">{{ b.species }} · RAW BATCH</div><span class="mo-brand">MARINE ORIGIN</span></div>
      <h1 class="mo-title" style="margin-top:.25rem;">{{ b.batch_code || b.code }}</h1>
        <div class="mo-sub">{{ b.species }} • {{ b.original_quantity || b.quantity }} kg • Remaining {{ b.remaining_quantity ?? '—' }} kg</div>
        <div class="mt-2"><app-status-badge [status]="b.status"></app-status-badge></div>
        <div class="text-xs text-slate-500 mt-2">Source: {{ b.vessel_name || b.source_vessel || '—' }} • {{ b.harbour_name || b.source_harbour || '—' }} • {{ b.landing_date || '' }}</div>
      <a *ngIf="canProcess()" routerLink="/processing" class="mo-cta text-center" style="text-decoration:none;font-size:1.1rem;">Process this batch →</a>
    </div>
    <div *ngIf="isSource()" class="card">
      <div class="text-xs font-bold tracking-widest text-slate-500 mb-3">HANDOFF STATUS</div>
      <div class="flex items-center text-xs font-bold">
        <div class="flex items-center gap-2" [ngClass]="handoffStage() >= 0 ? 'text-navy' : 'text-slate-400'">
          <span class="w-7 h-7 rounded-full flex items-center justify-center text-white" [ngClass]="handoffStage() >= 0 ? 'bg-navy' : 'bg-slate-300'">1</span> SENT
        </div>
        <div class="flex-1 h-0.5 mx-2" [ngClass]="handoffStage() >= 1 ? 'bg-ocean' : 'bg-slate-200'"></div>
        <div class="flex items-center gap-2" [ngClass]="handoffStage() >= 1 ? 'text-navy' : 'text-slate-400'">
          <span class="w-7 h-7 rounded-full flex items-center justify-center text-white" [ngClass]="handoffStage() >= 1 ? 'bg-ocean' : 'bg-slate-300'">2</span> RECEIVED
        </div>
        <div class="flex-1 h-0.5 mx-2" [ngClass]="handoffStage() >= 2 ? 'bg-ocean' : 'bg-slate-200'"></div>
        <div class="flex items-center gap-2" [ngClass]="handoffStage() >= 2 ? 'text-navy' : 'text-slate-400'">
          <span class="w-7 h-7 rounded-full flex items-center justify-center text-white" [ngClass]="handoffStage() >= 2 ? 'bg-ocean' : 'bg-slate-300'">3</span> IN PROCESS
        </div>
      </div>
    </div>
    <div class="grid lg:grid-cols-2 gap-4">
      <div class="card"><h3 class="font-bold text-navy mb-2">Source — where did this come from?</h3>
        <div class="text-sm text-slate-600">Vessel: <b>{{ b.vessel_name || b.source_vessel || '—' }}</b><br/>Harbour: <b>{{ b.harbour_name || b.source_harbour || '—' }}</b><br/>Landing: {{ b.landing_date || '—' }}<br/>Notes: {{ b.notes || '—' }}</div></div>
      <div class="card"><h3 class="font-bold text-navy mb-2">Destination — where did this go?</h3>
        <div class="text-sm space-y-1">
          <div>Processing: <b>{{ fwd.processing || '—' }}</b></div>
          <div>Inventory: <b>{{ (fwd.inventory || []).join(', ') || '—' }}</b></div>
          <div>Exports: <b>{{ (fwd.exports || []).join(', ') || '—' }}</b></div>
        </div></div>
    </div>
    <div class="card mt-4"><h3 class="font-bold text-navy mb-3">Trace</h3><app-timeline [steps]="steps"></app-timeline></div>
  </div>
  </div>`
})
export class RawDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  auth = inject(AuthService);
  b: any = null; loading = true; fwd: any = {}; steps: TlStep[] = [];
  canProcess() { return this.auth.role === 'ADMIN' || this.auth.role === 'PROCESSOR'; }
  isSource() { return this.auth.role === 'SOURCE_OPERATOR'; }
  handoffStage(): number {
    const s = String(this.b?.status || '').toUpperCase();
    if (['PROCESSING', 'PROCESSED', 'EXHAUSTED'].includes(s)) return 2;
    if (['AVAILABLE'].includes(s)) return 1;
    return 0;
  }
  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.api.get(`/raw-batches/${id}`).subscribe({
      next: (d: any) => {
        this.loading = false;
        this.b = d?.data ?? d;
        const t = this.b?.trace || this.b?.forward || {};
        this.fwd = { processing: t.processing_group || t.processing || this.b?.processing_group_code, inventory: t.inventory_groups || t.inventory || [], exports: t.export_groups || t.exports || [] };
        this.steps = [
          { title: 'RAW BATCH CREATED', sub: `${this.b.batch_code || ''} • ${this.b.original_quantity || this.b.quantity} kg ${this.b.species || ''}`, color: '#0A2540' },
          { title: 'PROCESSING', sub: String(this.fwd.processing || 'Awaiting processing'), color: '#F59E0B' },
          { title: 'INVENTORY', sub: (this.fwd.inventory || []).join(', ') || 'No inventory groups yet', color: '#00B4D8' },
          { title: 'EXPORTS', sub: (this.fwd.exports || []).join(', ') || 'Not yet exported', color: '#6366F1' },
        ];
      },
      error: () => { this.loading = false; }
    });
  }
}
