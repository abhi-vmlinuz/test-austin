import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-raw-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="mo-wrap">
    <div class="mo-head">
      <div class="mo-topline"><h1 class="mo-title">Batches</h1><span class="mo-brand">MARINE ORIGIN</span></div>
      <div class="mo-sub">Kochi Harbour • Harbour Operator</div>
    </div>
    <div class="mo-countrow">
      <span class="mo-pill mo-aqua">Today · {{ todayCount() }}</span>
      <button class="mo-pill" [ngClass]="onlyOpen ? 'mo-cyan' : 'mo-aqua'" (click)="onlyOpen = !onlyOpen; apply()">In progress</button>
    </div>
    <h2 class="mo-sec">Recent batches</h2>
    <div class="mo-stack">
      <a *ngFor="let b of filtered" [routerLink]="['/raw-batches', id(b)]" class="mo-card mo-row" style="text-decoration:none;">
        <div class="flex-1 min-w-0">
          <div class="mo-code">{{ b.batch_code || b.code }}</div>
          <div class="mo-name">{{ b.species }}</div>
          <div class="mo-qty">{{ fmtQty(b.original_quantity || b.quantity) }} kg</div>
        </div>
        <span class="mo-pill" [ngClass]="pillClass(b.status)">{{ pillLabel(b) }}</span>
      </a>
      <div *ngIf="!filtered.length" class="mo-card text-center text-sm" style="color:#5B6B7E;">No batches found. Register the first landing with the new button.</div>
    </div>
    <div class="mo-card" style="margin-top:1.25rem;">
      <input class="mo-input" placeholder="Search code / species" [(ngModel)]="f.q" (input)="apply()" style="font-size:1rem;padding:.8rem 1.1rem;" />
      <div class="mo-row" style="margin-top:.7rem;">
        <select class="mo-input" [(ngModel)]="f.status" (change)="apply()" style="font-size:1rem;padding:.8rem 1.1rem;"><option value="">All statuses</option>
          <option *ngFor="let s of ['CREATED','AVAILABLE','PROCESSING','PROCESSED','EXHAUSTED','REJECTED']" [value]="s">{{ s }}</option></select>
        <input class="mo-input" placeholder="Species" [(ngModel)]="f.species" (input)="apply()" style="font-size:1rem;padding:.8rem 1.1rem;" />
      </div>
    </div>
    <a routerLink="/raw-batches/create" class="mo-fab" aria-label="Register new batch">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
      <span>new</span>
    </a>
  </div>`
})
export class RawListComponent implements OnInit {
  private api = inject(ApiService);
  rows: any[] = []; filtered: any[] = [];
  f = { q: '', status: '', species: '' };
  onlyOpen = false;
  ngOnInit() { this.api.get('/raw-batches').subscribe({ next: (d: any) => { this.rows = d?.data ?? d?.rows ?? d ?? []; this.apply(); }, error: () => {} }); }
  id(b: any) { return b.raw_batch_id || b.id || b.batch_code; }
  todayCount() {
    const t = new Date().toISOString().slice(0, 10);
    return this.rows.filter((b: any) => String(b.landing_date || b.created_at || '').slice(0, 10) === t).length || this.rows.length;
  }
  fmtQty(q: any) { return (+q || 0).toLocaleString('en-IN'); }
  pillLabel(b: any) {
    const s = String(b.status || '').toUpperCase();
    if (s === 'PROCESSING') return 'Processing requested';
    if (s === 'PROCESSED') return 'Stored';
    if (s === 'CREATED' || s === 'AVAILABLE') return 'Landed' + (b.landed_at ? ' · ' + String(b.landed_at).slice(11, 16) : '');
    return b.status || '—';
  }
  pillClass(s: any) {
    const u = String(s || '').toUpperCase();
    if (u === 'PROCESSING') return 'mo-cyan';
    if (u === 'PROCESSED') return 'mo-mint';
    return 'mo-mint';
  }
  apply() {
    const q = this.f.q.toLowerCase();
    this.filtered = this.rows.filter((b: any) =>
      (!q || String(b.batch_code || b.code || '').toLowerCase().includes(q) || String(b.species || '').toLowerCase().includes(q)) &&
      (!this.f.status || String(b.status).toUpperCase() === this.f.status) &&
      (!this.f.species || String(b.species || '').toLowerCase().includes(this.f.species.toLowerCase())) &&
      (!this.onlyOpen || !['PROCESSED', 'EXHAUSTED', 'REJECTED'].includes(String(b.status).toUpperCase())));
  }
}
