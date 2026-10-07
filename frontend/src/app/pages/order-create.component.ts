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
  <h1 class="text-2xl font-extrabold text-navy mb-1">Create Importer Order</h1>
  <p class="text-sm text-slate-500 mb-4">Multi-item form: species + quantity + minimum quality.</p>
  <div class="card max-w-2xl space-y-3">
    <div class="grid md:grid-cols-2 gap-3">
      <div><label class="label">Destination country</label><input class="input" [(ngModel)]="m.destination_country" placeholder="Germany" /></div>
      <div><label class="label">Destination address</label><input class="input" [(ngModel)]="m.destination_address" placeholder="Hamburg Port" /></div>
      <div><label class="label">Shipping method</label><select class="input" [(ngModel)]="m.shipping_method"><option>SEA</option><option>AIR</option></select></div>
      <div><label class="label">Required date</label><input class="input" type="date" [(ngModel)]="m.required_date" /></div>
    </div>
    <div class="text-xs font-bold text-slate-500">ITEMS</div>
    <div *ngFor="let it of items; let i = index" class="grid grid-cols-4 gap-2">
      <input class="input" [(ngModel)]="it.species" [name]="'sp'+i" placeholder="Shrimp" />
      <input class="input" type="number" [(ngModel)]="it.required_quantity" [name]="'q'+i" placeholder="kg" />
      <input class="input" type="number" [(ngModel)]="it.minimum_quality_score" [name]="'s'+i" placeholder="min score" />
      <button (click)="items.splice(i,1)" class="btn-outline">✕</button>
    </div>
    <button (click)="items.push({species:'Shrimp',required_quantity:700,minimum_quality_score:8})" class="btn-outline text-xs">+ Add item</button>
    <div *ngIf="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{{ error }}</div>
    <button (click)="submit()" class="btn-ocean">{{ busy ? 'Placing…' : 'Place Order' }}</button>
  </div>`
})
export class OrderCreateComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private router = inject(Router);
  m: any = { destination_country: 'Germany', destination_address: 'Hamburg', shipping_method: 'SEA', required_date: '2026-10-20' };
  items = [{ species: 'Shrimp', required_quantity: 700, minimum_quality_score: 8 }];
  busy = false; error = '';
  submit() {
    this.busy = true; this.error = '';
    this.api.post('/orders', { ...this.m, items: this.items }).subscribe({
      next: (d: any) => { this.busy = false; this.toast.ok('Order placed'); const id = d?.data?.order_id || d?.order_id || d?.data?.id; this.router.navigate([id ? `/orders/${id}` : '/orders']); },
      error: (e) => { this.busy = false; this.error = e?.error?.message || 'Order failed'; }
    });
  }
}
