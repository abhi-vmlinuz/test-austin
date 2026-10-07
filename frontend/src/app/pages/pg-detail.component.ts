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
  <a routerLink="/processing" class="text-sm text-ocean-dark font-bold">← Processing</a>
  <div *ngIf="g" class="card mt-3">
    <h1 class="text-2xl font-extrabold text-navy">{{ g.processing_group_code || g.code }}</h1>
    <div class="text-sm text-slate-500">{{ g.species }} • {{ g.quantity }} kg</div>
    <div class="mt-2"><app-status-badge [status]="g.status || 'WAITING_FOR_QUALITY'"></app-status-badge></div>
    <div class="text-xs text-slate-500 mt-2">Raw batch: {{ g.raw_batch_code || g.batch_code || '—' }} • Input {{ g.input_quantity || '—' }} → Output {{ g.output_quantity || g.quantity }} • Waste {{ g.waste_quantity || '—' }}</div>
    <div class="mt-3 flex gap-2"><a routerLink="/quality" class="btn-ocean">Send to quality →</a></div>
  </div>
  <div class="card mt-4"><h3 class="font-bold text-navy mb-3">Trace</h3><app-timeline [steps]="steps"></app-timeline></div>`
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
