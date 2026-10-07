import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent],
  template: `
  <h1 class="text-2xl font-extrabold text-navy mb-4">Inventory Groups</h1>
  <div class="card mb-3 flex flex-wrap gap-2">
    <input class="input !w-44" placeholder="Species" [(ngModel)]="f.species" (input)="apply()" />
    <input class="input !w-36" placeholder="Min quality" type="number" [(ngModel)]="f.quality" (input)="apply()" />
    <select class="input !w-44" [(ngModel)]="f.status" (change)="apply()"><option value="">All statuses</option>
      <option *ngFor="let s of ['AVAILABLE','RESERVED','USABLE','NON-USABLE','PARTIALLY_RESERVED','CONSUMED']" [value]="s">{{ s }}</option></select>
    <input class="input !w-36" placeholder="Storage F-01" [(ngModel)]="f.storage" (input)="apply()" />
  </div>
  <div class="table-wrap"><table class="data"><thead><tr><th>Code</th><th>Species</th><th>Qty</th><th>Score</th><th>Avail</th><th>Status</th><th></th></tr></thead>
  <tbody><tr *ngFor="let g of filtered">
    <td class="font-bold text-navy">{{ g.inventory_group_code || g.code }}</td><td>{{ g.species }}</td>
    <td>{{ g.original_quantity || g.quantity }} kg</td><td><b>{{ g.quality_score ?? g.score }}</b></td>
    <td>{{ g.available_quantity ?? g.available ?? '—' }}</td>
    <td><app-status-badge [status]="g.status"></app-status-badge></td>
    <td><a [routerLink]="['/inventory', gid(g)]" class="text-ocean-dark font-bold">Open →</a></td></tr></tbody></table>
    <div *ngIf="!filtered.length" class="p-8 text-center text-sm text-slate-400">No inventory groups match.</div></div>`
})
export class InventoryComponent implements OnInit {
  private api = inject(ApiService);
  rows: any[] = []; filtered: any[] = [];
  f = { species: '', quality: '', status: '', storage: '' };
  ngOnInit() { this.api.get('/inventory').subscribe({ next: (d: any) => { this.rows = d?.data ?? d?.rows ?? d ?? []; this.apply(); }, error: () => {} }); }
  gid(g: any) { return g.inventory_group_id || g.id || g.inventory_group_code; }
  apply() {
    this.filtered = this.rows.filter((g: any) =>
      (!this.f.species || String(g.species || '').toLowerCase().includes(this.f.species.toLowerCase())) &&
      (!this.f.quality || (+g.quality_score || +g.score || 0) >= +this.f.quality) &&
      (!this.f.status || String(g.status || '').toUpperCase().replace(/ /g, '_') === this.f.status) &&
      (!this.f.storage || String(g.storage_location || g.freezer_code || JSON.stringify(g)).toUpperCase().includes(this.f.storage.toUpperCase())));
  }
}
