import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { StatusBadgeComponent } from '../shared/status-badge.component';
import { TimelineComponent, TlStep } from '../shared/timeline.component';

@Component({
  selector: 'app-raw-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent, TimelineComponent],
  template: `
  <a routerLink="/raw-batches" class="text-sm text-ocean-dark font-bold">← Raw batches</a>
  <div *ngIf="loading" class="card mt-3"><span class="spinner"></span> Loading…</div>
  <div *ngIf="!loading && b" class="mt-3 space-y-4">
    <div class="card flex flex-wrap gap-4 items-start">
      <div class="flex-1 min-w-[220px]"><h1 class="text-2xl font-extrabold text-navy">{{ b.batch_code || b.code }}</h1>
        <div class="text-sm text-slate-500">{{ b.species }} • {{ b.original_quantity || b.quantity }} kg • Remaining {{ b.remaining_quantity ?? '—' }} kg</div>
        <div class="mt-2"><app-status-badge [status]="b.status"></app-status-badge></div>
        <div class="text-xs text-slate-500 mt-2">Source: {{ b.vessel_name || b.source_vessel || '—' }} • {{ b.harbour_name || b.source_harbour || '—' }} • {{ b.landing_date || '' }}</div></div>
      <a routerLink="/processing" class="btn-primary">Process this batch →</a>
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
    <div class="card"><h3 class="font-bold text-navy mb-3">Forward trace: SOURCE → PROCESSING → INVENTORY → EXPORTS</h3>
      <app-timeline [steps]="steps"></app-timeline></div>
  </div>`
})
export class RawDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  b: any = null; loading = true; fwd: any = {}; steps: TlStep[] = [];
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
