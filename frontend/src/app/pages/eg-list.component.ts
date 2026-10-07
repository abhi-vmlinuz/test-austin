import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-eg-list',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent],
  template: `
  <h1 class="text-2xl font-extrabold text-navy mb-4">Export Groups</h1>
  <div class="table-wrap"><table class="data"><thead><tr><th>Code</th><th>Order</th><th>Qty</th><th>Status</th><th></th></tr></thead>
  <tbody><tr *ngFor="let g of rows">
    <td class="font-bold text-navy">{{ g.export_group_code || g.code }}</td><td>{{ g.order_code || g.order_id }}</td>
    <td>{{ g.total_quantity || g.quantity }} kg</td><td><app-status-badge [status]="g.status"></app-status-badge></td>
    <td><a [routerLink]="['/export-groups', egid(g)]" class="text-ocean-dark font-bold">Open →</a></td></tr></tbody></table>
    <div *ngIf="!rows.length" class="p-8 text-center text-sm text-slate-400">No export groups. Allocate an order first.</div></div>`
})
export class EgListComponent implements OnInit {
  private api = inject(ApiService);
  rows: any[] = [];
  ngOnInit() { this.api.get('/export-groups').subscribe({ next: (d: any) => { this.rows = d?.data ?? d?.rows ?? d ?? []; }, error: () => {} }); }
  egid(g: any) { return g.export_group_id || g.id || g.export_group_code; }
}
