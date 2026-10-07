import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  template: `
  <h1 class="text-2xl font-extrabold text-navy mb-4">Reports</h1>
  <div class="grid lg:grid-cols-3 gap-4">
    <div class="card"><h3 class="font-bold text-navy mb-2">Inventory report</h3><div class="text-sm">{{ inv ? (inv | json).slice(0,400) : 'Loading…' }}</div>
      <button (click)="dl('inventory')" class="btn-outline !py-1.5 mt-2 text-xs">Download JSON</button></div>
    <div class="card"><h3 class="font-bold text-navy mb-2">Shipments report</h3><div class="text-sm">{{ ship ? (ship | json).slice(0,400) : 'Loading…' }}</div>
      <button (click)="dl('shipments')" class="btn-outline !py-1.5 mt-2 text-xs">Download JSON</button></div>
    <div class="card"><h3 class="font-bold text-navy mb-2">Dashboard analytics</h3><div class="text-sm">{{ dash ? (dash | json).slice(0,400) : 'Loading…' }}</div>
      <button (click)="dl('dashboard')" class="btn-outline !py-1.5 mt-2 text-xs">Download JSON</button></div>
  </div>`
})
export class ReportsComponent implements OnInit {
  private api = inject(ApiService);
  inv: any = null; ship: any = null; dash: any = null;
  ngOnInit() {
    this.api.get('/reports/inventory').subscribe({ next: (d) => (this.inv = d), error: () => {} });
    this.api.get('/reports/shipments').subscribe({ next: (d) => (this.ship = d), error: () => {} });
    this.api.get('/reports/dashboard').subscribe({ next: (d) => (this.dash = d), error: () => {} });
  }
  dl(which: string) {
    const data = which === 'inventory' ? this.inv : which === 'shipments' ? this.ship : this.dash;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `report-${which}.json`; a.click();
  }
}
