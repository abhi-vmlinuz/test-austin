import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent],
  template: `
  <div class="mo-wrap">
    <div *ngIf="isImporter(); else classicHead">
      <div class="mo-head">
        <div class="mo-topline"><h1 class="mo-title">Kerala seafood</h1><span class="mo-brand">MARINE ORIGIN</span></div>
        <div class="mo-sub">Verified supply</div>
      </div>
      <div class="mo-seg" style="flex-wrap:wrap;">
        <button class="mo-segbtn" [ngClass]="filt === 'premium' ? 'on' : ''" (click)="filt = filt === 'premium' ? '' : 'premium'">Premium</button>
        <button class="mo-segbtn" [ngClass]="filt === 'air' ? 'on' : ''" (click)="filt = filt === 'air' ? '' : 'air'">Air eligible</button>
        <button class="mo-segbtn" [ngClass]="filt === 'frozen' ? 'on' : ''" (click)="filt = filt === 'frozen' ? '' : 'frozen'">Frozen</button>
      </div>
      <h2 class="mo-sec">Available products</h2>
      <div class="mo-stack">
        <a *ngFor="let p of products()" routerLink="/orders/create" class="mo-card mo-row" style="text-decoration:none;">
          <span class="mo-tile">{{ initials(p.species) }}</span>
          <div class="flex-1 min-w-0">
            <div class="font-extrabold" style="color:#101828;font-size:1.45rem;line-height:1.15;">{{ p.species }}</div>
            <div style="color:#101828;font-size:1.1rem;margin-top:.15rem;">Whole · Frozen</div>
            <div class="mo-countrow" style="margin:.6rem 0 0;"><span class="mo-pill" [ngClass]="gradeClass(scoreOf(p))" style="font-size:.95rem;">{{ gradeLabel(scoreOf(p)) }}</span></div>
          </div>
        </a>
        <div *ngIf="!products().length" class="mo-card text-center text-sm" style="color:#5B6B7E;">No products match this filter.</div>
      </div>
      <div class="mo-row" style="margin-top:1.25rem;">
        <h2 class="mo-sec" style="margin:0;">My orders</h2>
        <a *ngIf="canCreate()" routerLink="/orders/create" class="mo-pill mo-cyan" style="margin-left:auto;text-decoration:none;font-size:.95rem;">+ New Order</a>
      </div>
    </div>
    <ng-template #classicHead>
      <div class="mo-head">
        <div class="mo-topline"><h1 class="mo-title">Importer Orders</h1><span class="mo-brand">MARINE ORIGIN</span></div>
        <div class="mo-sub">Verified supply</div>
      </div>
      <div *ngIf="canCreate()" class="mo-countrow"><a routerLink="/orders/create" class="mo-pill mo-cyan" style="text-decoration:none;">+ New Order</a></div>
    </ng-template>
    <div class="mo-stack" style="margin-top:1rem;">
      <a *ngFor="let o of rows" [routerLink]="['/orders', oid(o)]" class="mo-card mo-row" style="text-decoration:none;">
        <div class="flex-1 min-w-0">
          <div class="mo-code">{{ o.order_code || o.code || ('ORD-' + (o.order_id || o.id)) }}</div>
          <div class="font-extrabold" style="color:#101828;font-size:1.25rem;">{{ o.destination_country || o.destination }}</div>
          <div style="color:#141E2E;">{{ o.shipping_method || o.shipping }} • {{ o.required_date || o.requiredDate || '—' }}</div>
        </div>
        <app-status-badge [status]="o.status"></app-status-badge>
      </a>
      <div *ngIf="!rows.length" class="mo-card text-center text-sm" style="color:#5B6B7E;">No orders yet.</div>
    </div>
  </div>`
})
export class OrdersComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  rows: any[] = [];
  lots: any[] = [];
  filt = 'premium';
  canCreate() { return this.auth.role === 'ADMIN' || this.auth.role === 'IMPORTER'; }
  isImporter() { return this.auth.role === 'IMPORTER' || this.auth.role === 'ADMIN'; }
  ngOnInit() {
    this.api.get('/orders').subscribe({ next: (d: any) => { this.rows = d?.data ?? d?.rows ?? d ?? []; }, error: () => {} });
    this.api.get('/inventory').subscribe({ next: (d: any) => { this.lots = d?.data ?? d?.rows ?? d ?? []; }, error: () => {} });
  }
  oid(o: any) { return o.order_id || o.id || o.order_code; }
  scoreOf(p: any) { return +p.quality_score || +p.score || 0; }
  initials(s: any) { return String(s || 'SEA').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'SEA'; }
  gradeLabel(s: number) {
    if (s >= 9) return 'Premium';
    if (s >= 8) return 'Export Ready';
    if (s >= 6) return 'Usable';
    return 'Standard';
  }
  gradeClass(s: number) {
    if (s >= 9) return 'mo-mint';
    if (s >= 8) return 'mo-sky';
    if (s >= 6) return 'mo-aqua';
    return 'mo-sky';
  }
  products() {
    const avail = this.lots.filter((l: any) => ['AVAILABLE', 'USABLE'].includes(String(l.status || '').toUpperCase()));
    const base = avail.length ? avail : this.lots;
    if (this.filt === 'premium') return base.filter((l: any) => this.scoreOf(l) >= 9);
    return base;
  }
}
