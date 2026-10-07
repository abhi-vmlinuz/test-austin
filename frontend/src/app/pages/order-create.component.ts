import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-order-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="mo-wrap">
    <div class="mo-head">
      <div class="mo-topline"><h1 class="mo-title">{{ items[0]?.species || 'New order' }}</h1><span class="mo-brand">MARINE ORIGIN</span></div>
      <div class="mo-sub">Whole · Frozen</div>
    </div>
    <div class="font-extrabold" style="color:#101828;font-size:1.35rem;">{{ gradeHeadline() }}</div>
    <div><label class="mo-label">Quantity</label><input class="mo-input" [(ngModel)]="qtyText" (input)="syncQty()" placeholder="500 kg" /></div>
    <div><label class="mo-label">Destination</label><input class="mo-input" [(ngModel)]="m.destination_country" placeholder="Germany" /></div>
    <div><label class="mo-label">Destination address</label><input class="mo-input" [(ngModel)]="m.destination_address" placeholder="Hamburg Port" /></div>
    <div class="mo-row" style="margin-top:.7rem;">
      <div style="flex:1;"><label class="mo-label" style="margin-top:0;">Minimum quality</label><input class="mo-input" type="number" [(ngModel)]="items[0].minimum_quality_score" /></div>
      <div style="flex:1;"><label class="mo-label" style="margin-top:0;">Required date</label><input class="mo-input" type="date" [(ngModel)]="m.required_date" /></div>
    </div>
    <div *ngFor="let it of items.slice(1); let i = index" class="mo-row" style="margin-top:.6rem;">
      <input class="mo-input" [(ngModel)]="it.species" [name]="'spx'+i" placeholder="Species" />
      <input class="mo-input" type="number" [(ngModel)]="it.required_quantity" [name]="'qx'+i" placeholder="kg" />
      <button (click)="items.splice(i+1,1)" class="mo-ghost" style="width:auto;margin-top:0;padding:.6rem 1rem;">✕</button>
    </div>
    <button (click)="items.push({species:'Shrimp',required_quantity:700,minimum_quality_score:8})" class="mo-ghost" style="font-size:1rem;">+ Add item</button>

    <h2 class="mo-sec">Recommended logistics</h2>
    <div class="mo-stack">
      <button (click)="m.shipping_method = 'AIR'" class="mo-card text-left" style="width:100%;" [ngClass]="m.shipping_method === 'AIR' ? 'mo-selcard' : ''">
        <span class="mo-pill mo-mint" style="font-size:.95rem;">BEST MATCH</span>
        <div class="font-extrabold" style="color:#101828;font-size:1.5rem;margin-top:.6rem;">Air Freight · Premium Cold</div>
        <div style="color:#101828;font-size:1.1rem;margin-top:.2rem;">COK → AMS · 9h 20m</div>
        <div style="color:#101828;font-size:1.05rem;">Cold-chain compatible · 1,200 kg</div>
      </button>
      <button (click)="m.shipping_method = 'SEA'" class="mo-card text-left" style="width:100%;" [ngClass]="m.shipping_method === 'SEA' ? 'mo-selcard' : ''">
        <div class="font-extrabold" style="color:#101828;font-size:1.5rem;">Sea Freight · Reefer</div>
        <div style="color:#101828;font-size:1.1rem;margin-top:.2rem;">COK → RTM · 18 days</div>
        <div style="color:#101828;font-size:1.05rem;">Lower cost · 20,000 kg capacity</div>
      </button>
    </div>
    <div *ngIf="error" class="mo-err">{{ error }}</div>
    <button (click)="submit()" class="mo-cta">{{ busy ? 'Placing…' : 'Continue to order' }}</button>
    <div class="mo-note"><a routerLink="/orders" class="font-bold" style="color:#2173B5;">← Back to storefront</a></div>
  </div>`
})
export class OrderCreateComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private router = inject(Router);
  m: any = { destination_country: 'Germany', destination_address: 'Hamburg', shipping_method: 'SEA', required_date: '2026-10-20' };
  items = [{ species: 'Yellowfin Tuna', required_quantity: 500, minimum_quality_score: 9 }];
  qtyText = '500 kg';
  busy = false; error = '';
  syncQty() {
    const n = parseInt(String(this.qtyText).replace(/[^0-9]/g, ''), 10);
    if (!isNaN(n) && this.items[0]) this.items[0].required_quantity = n;
  }
  gradeHeadline() {
    const s = +(this.items[0]?.minimum_quality_score || 0);
    if (s >= 9) return 'Premium Export · 9.4 / 10';
    if (s >= 8) return 'Export Ready · 8.5 / 10';
    return 'Verified grade · ' + (s || '—') + ' / 10';
  }
  submit() {
    this.busy = true; this.error = '';
    this.api.post('/orders', { ...this.m, items: this.items }).subscribe({
      next: (d: any) => { this.busy = false; this.toast.ok('Order placed'); const id = d?.data?.order_id || d?.order_id || d?.data?.id; this.router.navigate([id ? `/orders/${id}` : '/orders']); },
      error: (e) => { this.busy = false; this.error = e?.error?.message || 'Order failed'; }
    });
  }
}
