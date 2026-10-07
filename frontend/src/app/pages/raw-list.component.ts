import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-raw-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent],
  template: `
  <div class="flex items-center gap-3 mb-4"><h1 class="text-2xl font-extrabold text-navy">Raw Batches</h1>
    <a routerLink="/raw-batches/create" class="btn-ocean ml-auto">+ Create Raw Batch</a></div>
  <div class="card mb-3 flex flex-wrap gap-2">
    <input class="input !w-56" placeholder="Search code / species" [(ngModel)]="f.q" (input)="apply()" />
    <select class="input !w-44" [(ngModel)]="f.status" (change)="apply()"><option value="">All statuses</option>
      <option *ngFor="let s of ['CREATED','AVAILABLE','PROCESSING','PROCESSED','EXHAUSTED','REJECTED']" [value]="s">{{ s }}</option></select>
    <input class="input !w-44" placeholder="Species" [(ngModel)]="f.species" (input)="apply()" />
  </div>
  <div class="table-wrap"><table class="data"><thead><tr><th>Batch code</th><th>Species</th><th>Qty</th><th>Remaining</th><th>Status</th><th></th></tr></thead>
  <tbody><tr *ngFor="let b of filtered">
    <td class="font-bold text-navy">{{ b.batch_code || b.code }}</td><td>{{ b.species }}</td>
    <td>{{ b.original_quantity || b.quantity }} kg</td><td>{{ b.remaining_quantity ?? b.remaining ?? '—' }} kg</td>
    <td><app-status-badge [status]="b.status"></app-status-badge></td>
    <td><a [routerLink]="['/raw-batches', id(b)]" class="text-ocean-dark font-bold">Open →</a></td></tr></tbody></table>
    <div *ngIf="!filtered.length" class="p-8 text-center text-sm text-slate-400">No raw batches. Create the first one to start the chain.</div></div>`
})
export class RawListComponent implements OnInit {
  private api = inject(ApiService);
  rows: any[] = []; filtered: any[] = [];
  f = { q: '', status: '', species: '' };
  ngOnInit() { this.api.get('/raw-batches').subscribe({ next: (d: any) => { this.rows = d?.data ?? d?.rows ?? d ?? []; this.apply(); }, error: () => {} }); }
  id(b: any) { return b.raw_batch_id || b.id || b.batch_code; }
  apply() {
    const q = this.f.q.toLowerCase();
    this.filtered = this.rows.filter((b: any) =>
      (!q || String(b.batch_code || b.code || '').toLowerCase().includes(q) || String(b.species || '').toLowerCase().includes(q)) &&
      (!this.f.status || String(b.status).toUpperCase() === this.f.status) &&
      (!this.f.species || String(b.species || '').toLowerCase().includes(this.f.species.toLowerCase())));
  }
}
