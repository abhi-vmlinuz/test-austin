import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-raw-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <h1 class="text-2xl font-extrabold text-navy mb-1">Create Raw Batch</h1>
  <p class="text-sm text-slate-500 mb-4">Seafood already sorted — enter the known quantity. <a routerLink="/raw-batches" class="text-ocean-dark font-bold">Back to list</a></p>
  <div class="card max-w-2xl space-y-3">
    <div class="grid md:grid-cols-2 gap-3">
      <div><label class="label">Species / Product *</label><input class="input" [(ngModel)]="m.species" placeholder="Shrimp" /></div>
      <div><label class="label">Quantity (kg) *</label><input class="input" type="number" [(ngModel)]="m.quantity" placeholder="800" /></div>
      <div><label class="label">Unit</label><select class="input" [(ngModel)]="m.unit"><option>kg</option><option>g</option><option>ton</option></select></div>
      <div><label class="label">Landing date</label><input class="input" type="date" [(ngModel)]="m.landing_date" /></div>
      <div><label class="label">Source vessel</label><input class="input" [(ngModel)]="m.vessel" placeholder="Ocean Star" /></div>
      <div><label class="label">Source harbour</label><input class="input" [(ngModel)]="m.harbour" placeholder="Kochi" /></div>
      <div class="md:col-span-2"><label class="label">Source / origin reference</label><input class="input" [(ngModel)]="m.origin_ref" placeholder="Landing ref / auction slip" /></div>
      <div class="md:col-span-2"><label class="label">Batch notes</label><textarea class="input" rows="2" [(ngModel)]="m.notes"></textarea></div>
    </div>
    <div *ngIf="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{{ error }}</div>
    <button (click)="submit()" [disabled]="busy" class="btn-ocean">{{ busy ? 'Creating…' : 'Create Raw Batch' }}</button>
  </div>`
})
export class RawCreateComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private router = inject(Router);
  m: any = { species: 'Shrimp', quantity: 800, unit: 'kg', vessel: 'Ocean Star', harbour: 'Kochi Harbour', landing_date: '2026-10-07', origin_ref: '', notes: '' };
  busy = false; error = '';
  submit() {
    if (!this.m.species || !(+this.m.quantity > 0)) { this.error = 'Species is mandatory and quantity must be greater than 0.'; return; }
    this.busy = true; this.error = '';
    this.api.post('/raw-batches', {
      species: this.m.species, quantity: +this.m.quantity, original_quantity: +this.m.quantity, unit: this.m.unit,
      vessel_name: this.m.vessel, harbour_name: this.m.harbour, landing_date: this.m.landing_date,
      source_reference: this.m.origin_ref, notes: this.m.notes, source_vessel: this.m.vessel, source_harbour: this.m.harbour
    }).subscribe({
      next: (d: any) => { this.busy = false; this.toast.ok('Raw batch created'); const id = d?.data?.raw_batch_id || d?.data?.id || d?.raw_batch_id || d?.id; this.router.navigate([id ? `/raw-batches/${id}` : '/raw-batches']); },
      error: (e) => { this.busy = false; this.error = e?.error?.message || e?.error?.error || 'Creation failed'; }
    });
  }
}
