import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { StatusBadgeComponent } from '../shared/status-badge.component';
import { TimelineComponent } from '../shared/timeline.component';

@Component({
  selector: 'app-pg-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent, TimelineComponent],
  template: `
  <div class="mo-wrap">
  <a routerLink="/processing" class="text-sm font-bold" style="color:#2173B5;">← Processing</a>
  <div *ngIf="g" class="mo-card" style="margin-top:.75rem;">
    <div class="mo-topline"><div class="mo-code">PROCESSING GROUP</div><span class="mo-brand">MARINE ORIGIN</span></div>
    <h1 class="mo-title" style="margin-top:.25rem;">{{ g.processing_group_code || g.code }}</h1>
    <div class="mo-sub">{{ g.species }} • {{ g.quantity }} kg</div>
    <div class="mt-2"><app-status-badge [status]="g.status || 'WAITING_FOR_QUALITY'"></app-status-badge></div>
    <div class="text-xs text-slate-500 mt-2">Raw batch: {{ g.raw_batch_code || g.batch_code || '—' }} • Input {{ g.input_quantity || '—' }} → Output {{ g.output_quantity || g.quantity }} • Waste {{ g.waste_quantity || '—' }}</div>
    <div class="mt-3"><span class="text-xs font-bold text-slate-500 bg-slate-100 rounded-full px-3 py-2">Quality handoff: the inspector picks this group from the quality queue.</span></div>
  </div>
  <div class="card mt-4"><h3 class="font-bold text-navy mb-3">Trace</h3><app-timeline [steps]="steps"></app-timeline></div>
  </div>`
})
export class PgDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  g: any = null; steps: any[] = [];
  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.api.get(`/processing-groups/${id}`).subscribe({
      next: (d: any) => {
        this.g = d?.data ?? d;
        this.steps = [
          { title: 'RAW BATCH', sub: this.g.raw_batch_code || this.g.batch_code || '', color: '#0A2540' },
          { title: 'PROCESSING', sub: `${this.g.input_quantity || ''} → ${this.g.output_quantity || this.g.quantity} kg`, color: '#F59E0B' },
          { title: 'QUALITY', sub: this.g.quality_score ? `Score ${this.g.quality_score}` : 'Waiting for inspection', color: '#8B5CF6' },
        ];
      }, error: () => {}
    });
  }
}
