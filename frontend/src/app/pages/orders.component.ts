import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent],
  template: `
  <div class="flex items-center gap-3 mb-4"><h1 class="text-2xl font-extrabold text-navy">Importer Orders</h1>
    <a routerLink="/orders/create" class="btn-ocean ml-auto">+ New Order</a></div>
  <div class="table-wrap"><table class="data"><thead><tr><th>Order</th><th>Destination</th><th>Method</th><th>Required</th><th>Status</th><th></th></tr></thead>
  <tbody><tr *ngFor="let o of rows">
    <td class="font-bold text-navy">{{ o.order_code || o.code || ('ORD-' + (o.order_id || o.id)) }}</td>
    <td>{{ o.destination_country || o.destination }}</td><td>{{ o.shipping_method || o.shipping }}</td>
    <td>{{ o.required_date || o.requiredDate || '—' }}</td><td><app-status-badge [status]="o.status"></app-status-badge></td>
    <td><a [routerLink]="['/orders', oid(o)]" class="text-ocean-dark font-bold">Open →</a></td></tr></tbody></table>
    <div *ngIf="!rows.length" class="p-8 text-center text-sm text-slate-400">No orders yet.</div></div>`
})
export class OrdersComponent implements OnInit {
  private api = inject(ApiService);
  rows: any[] = [];
  ngOnInit() { this.api.get('/orders').subscribe({ next: (d: any) => { this.rows = d?.data ?? d?.rows ?? d ?? []; }, error: () => {} }); }
  oid(o: any) { return o.order_id || o.id || o.order_code; }
}
