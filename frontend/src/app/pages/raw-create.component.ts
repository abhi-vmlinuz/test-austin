import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-raw-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="mo-wrap">
    <div class="mo-head">
      <div class="mo-topline"><h1 class="mo-title">Register Batch</h1><span class="mo-brand">MARINE ORIGIN</span></div>
      <div class="mo-sub">{{ entry === 'manual' ? 'New landing' : 'Capture harbour document' }}</div>
    </div>
    <div class="mo-seg">
      <button class="mo-segbtn" [ngClass]="entry === 'manual' ? 'on' : ''" (click)="entry = 'manual'">Manual Entry</button>
      <button class="mo-segbtn" [ngClass]="entry === 'ocr' ? 'on' : ''" (click)="entry = 'ocr'">OCR</button>
    </div>

    <div *ngIf="done" class="mo-card text-center" style="margin-top:1.25rem;border-top:4px solid #1F9D55;">
      <h2 class="mo-name" style="font-size:1.4rem;">Request sent — the processor has been notified.</h2>
      <p *ngIf="createdCode" class="mo-sub">Batch {{ createdCode }} is now in the incoming queue.</p>
      <div class="mo-row" style="justify-content:center;margin-top:1rem;">
        <a routerLink="/raw-batches" class="mo-pill mo-cyan" style="text-decoration:none;">Back to list</a>
        <a routerLink="/dashboard" class="mo-pill mo-aqua" style="text-decoration:none;">Dashboard</a>
      </div>
    </div>

    <div *ngIf="!done && entry === 'manual'">
      <h2 class="mo-sec">Landing details</h2>
      <div><label class="mo-label">Species</label><input class="mo-input" [(ngModel)]="m.species" placeholder="Yellowfin Tuna" /></div>
      <div><label class="mo-label">Quantity</label><input class="mo-input" [(ngModel)]="qtyText" (input)="syncQty()" placeholder="2,430 kg" /></div>
      <div><label class="mo-label">Landing date</label><input class="mo-input" [(ngModel)]="dateText" placeholder="06 Oct 2026" /></div>
      <div><label class="mo-label">Harbour</label><input class="mo-input" [(ngModel)]="m.harbour" placeholder="Kochi Harbour" /></div>
      <div><label class="mo-label">Vessel</label><input class="mo-input" [(ngModel)]="m.vessel" placeholder="KL-MP-23891" /></div>
      <div><label class="mo-label">Unit</label><select class="mo-input" [(ngModel)]="m.unit"><option>kg</option><option>g</option><option>ton</option></select></div>
      <div><label class="mo-label">Source / origin reference</label><input class="mo-input" [(ngModel)]="m.origin_ref" placeholder="Landing ref / auction slip" /></div>
      <div><label class="mo-label">Batch notes</label><textarea class="mo-input" rows="2" [(ngModel)]="m.notes"></textarea></div>
      <div *ngIf="error" class="mo-err">{{ error }}</div>
      <button (click)="submit()" [disabled]="busy" class="mo-cta">{{ busy ? 'Creating…' : 'Create batch' }}</button>
      <div class="mo-note">Source: harbour register</div>
    </div>

    <div *ngIf="!done && entry === 'ocr'">
      <div class="mo-capture" style="margin-top:1.25rem;">
        <h2 class="mo-name" style="font-size:1.6rem;">Scan harbour register</h2>
        <p class="mo-sub" style="margin:.4rem 0 1.2rem;">Align the document inside the frame</p>
        <button class="mo-capbtn" (click)="captured = true">Capture</button>
      </div>
      <div *ngIf="captured">
        <h2 class="mo-sec">Extraction review</h2>
        <div class="mo-xrow"><div><div class="mo-xlab">Vessel registration</div><div class="mo-xval">{{ m.vessel || '—' }}</div></div><div class="mo-xconf">97%</div></div>
        <div class="mo-xrow"><div><div class="mo-xlab">Species</div><div class="mo-xval">{{ m.species || '—' }}</div></div><div class="mo-xconf">94%</div></div>
        <div class="mo-xrow"><div><div class="mo-xlab">Weight</div><div class="mo-xval">{{ fmtNum(m.quantity) }} kg</div></div><div class="mo-xconf">82%</div></div>
        <div class="mo-xrow"><div><div class="mo-xlab">Landing date</div><div class="mo-xval">{{ prettyDate() }}</div></div><div class="mo-xconf">99%</div></div>
        <div><label class="mo-label">Correct species if needed</label><input class="mo-input" [(ngModel)]="m.species" /></div>
        <div><label class="mo-label">Correct quantity (kg) if needed</label><input class="mo-input" type="number" [(ngModel)]="m.quantity" /></div>
        <button (click)="entry = 'manual'" class="mo-cta">Review &amp; confirm</button>
        <div class="mo-note">Confirm loads the values into the landing form for final review.</div>
      </div>
      <div *ngIf="!captured" class="mo-note">Point at the harbour register and capture to extract landing fields.</div>
    </div>
  </div>`
})
export class RawCreateComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  m: any = { species: 'Yellowfin Tuna', quantity: 2430, unit: 'kg', vessel: 'KL-MP-23891', harbour: 'Kochi Harbour', landing_date: '2026-10-06', origin_ref: '', notes: '' };
  qtyText = '2,430 kg';
  dateText = '06 Oct 2026';
  entry: 'manual' | 'ocr' = 'manual';
  captured = false;
  busy = false; error = ''; done = false; createdCode = '';
  syncQty() {
    const n = parseInt(String(this.qtyText).replace(/[^0-9]/g, ''), 10);
    if (!isNaN(n)) this.m.quantity = n;
  }
  fmtNum(n: any) { return (+n || 0).toLocaleString('en-IN'); }
  prettyDate() {
    if (/^\d{2} \w{3} \d{4}$/.test(this.dateText)) return this.dateText;
    const d = new Date(this.m.landing_date || this.dateText);
    if (isNaN(+d)) return this.m.landing_date || '—';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  submit() {
    if (!this.m.species || !(+this.m.quantity > 0)) { this.error = 'Species is mandatory and quantity must be greater than 0.'; return; }
    this.busy = true; this.error = '';
    this.api.post('/raw-batches', {
      species: this.m.species, quantity: +this.m.quantity, original_quantity: +this.m.quantity, unit: this.m.unit,
      vessel_name: this.m.vessel, harbour_name: this.m.harbour, landing_date: this.m.landing_date,
      source_reference: this.m.origin_ref, notes: this.m.notes, source_vessel: this.m.vessel, source_harbour: this.m.harbour
    }).subscribe({
      next: (d: any) => { this.busy = false; this.done = true; this.createdCode = d?.data?.batch_code || d?.batch_code || ''; this.toast.ok('Request sent'); },
      error: (e) => { this.busy = false; this.error = e?.error?.message || e?.error?.error || 'Creation failed'; }
    });
  }
}
