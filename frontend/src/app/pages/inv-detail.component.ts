import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { StatusBadgeComponent } from '../shared/status-badge.component';
import { TimelineComponent } from '../shared/timeline.component';

@Component({
  selector: 'app-inv-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent, TimelineComponent],
  template: `
  <a routerLink="/inventory" class="text-sm text-ocean-dark font-bold">← Inventory</a>
  <div *ngIf="g" class="card mt-3">
    <h1 class="text-2xl font-extrabold text-navy">{{ g.inventory_group_code || g.code }}</h1>
    <div class="text-sm text-slate-500">{{ g.species }} • Original {{ g.original_quantity || g.quantity }} kg • Reserved {{ g.reserved_quantity || 0 }} • Available {{ g.available_quantity ?? '—' }}</div>
    <div class="mt-2 flex gap-2"><app-status-badge [status]="g.status"></app-status-badge><span class="badge bg-slate-100">Score {{ g.quality_score ?? g.score }}</span></div>
    <div class="text-xs text-slate-500 mt-2">Parent PG: {{ g.processing_group_code || '—' }} • QR: {{ g.quality_result_id || '—' }}</div>
  </div>
  <div class="card mt-4"><h3 class="font-bold text-navy mb-3">Storage history</h3><app-timeline [steps]="hist"></app-timeline></div>`
})
export class InvDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  g: any = null; hist: any[] = [];
  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.api.get(`/inventory/${id}`).subscribe({ next: (d: any) => { this.g = d?.data ?? d; }, error: () => {} });
    this.api.get(`/inventory/${id}/history`).subscribe({
      next: (d: any) => {
        const rows = d?.data ?? d?.rows ?? d ?? [];
        const arr = Array.isArray(rows) ? rows : [];
        this.hist = arr.map((h: any) => ({ title: h.freezer_code || h.storage_location || 'Storage', sub: `${h.quantity || ''} kg • ${h.entry_time || h.entryTime || ''} → ${h.exit_time || h.exitTime || 'now'}`, detail: `${h.temperature || ''}`, color: '#00B4D8' }));
      },
      error: () => { this.api.get(`/storage/history/${id}`).subscribe({ next: (d: any) => { const rows = d?.data ?? d ?? []; this.hist = (Array.isArray(rows) ? rows : []).map((h: any) => ({ title: h.freezer_code || 'Storage', sub: `${h.quantity} kg`, color: '#00B4D8' })); }, error: () => {} }); }
    });
  }
}
