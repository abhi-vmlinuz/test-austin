import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-eg-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent],
  template: `
  <a routerLink="/export-groups" class="text-sm text-ocean-dark font-bold">← Export groups</a>
  <div *ngIf="g" class="card mt-3">
    <div class="flex flex-wrap gap-4 items-start">
      <div class="flex-1"><h1 class="text-2xl font-extrabold text-navy">{{ g.export_group_code || g.code }}</h1>
        <div class="text-sm text-slate-500">Order {{ g.order_code || g.order_id }} • {{ g.total_quantity || g.quantity }} kg</div>
        <div class="mt-2"><app-status-badge [status]="g.status"></app-status-badge></div></div>
      <div class="text-center"><div class="text-xs font-bold text-slate-500">QR CODE</div>
        <img *ngIf="qrSrc" [src]="qrSrc" class="w-28 h-28 border rounded-lg mx-auto" alt="QR" />
        <div class="text-[11px] text-slate-500 mt-1 break-all max-w-[140px]">{{ traceUrl }}</div>
        <a [routerLink]="['/traceability', code()]" class="text-ocean-dark text-xs font-bold">Open traceability →</a></div>
    </div>
    <div class="grid md:grid-cols-2 gap-3 mt-4 text-sm">
      <div class="bg-slate-50 rounded-xl p-3"><b>Sources</b><div *ngFor="let s of sources" class="text-slate-600">{{ s.inventory_group_code || s.code }} → {{ s.quantity }} kg (score {{ s.quality_score || s.score }})</div>
        <div *ngIf="!sources.length" class="text-slate-400">—</div></div>
      <div class="bg-slate-50 rounded-xl p-3"><b>Packages ({{ packages.length }})</b><div *ngFor="let p of packages" class="text-slate-600">{{ p.package_number || p.code }} → {{ p.weight || p.quantity }} kg</div>
        <div class="flex gap-2 mt-2"><input class="input" type="number" [(ngModel)]="pkgCount" placeholder="7" /><button (click)="makePackages()" class="btn-outline !py-1.5">Pack</button></div></div>
      <div class="bg-slate-50 rounded-xl p-3"><b>Documents</b><div *ngFor="let d of docs" class="text-slate-600">{{ d.document_type }} • {{ d.document_number }} • {{ d.status }}</div>
        <div *ngIf="!docs.length" class="text-slate-400">No documents.</div></div>
      <div class="bg-slate-50 rounded-xl p-3"><b>Shipment</b><div class="text-slate-600">{{ ship ? ((ship.origin || '') + ' → ' + (ship.destination || '') + ' • ' + (ship.status || '')) : 'Not yet shipped.' }}</div>
        <button (click)="downloadReport()" class="btn-primary !py-1.5 mt-2">Download traceability report</button></div>
    </div>
  </div>`
})
export class EgDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  g: any = null; sources: any[] = []; packages: any[] = []; docs: any[] = []; ship: any = null;
  qrSrc = ''; traceUrl = ''; pkgCount = 7;
  code() { return this.g?.export_group_code || this.route.snapshot.paramMap.get('id'); }
  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.api.get(`/export-groups/${id}`).subscribe({
      next: (d: any) => {
        this.g = d?.data ?? d;
        this.sources = this.g?.sources || this.g?.items || this.g?.export_group_items || [];
        this.packages = this.g?.packages || [];
        this.docs = this.g?.documents || [];
        this.ship = this.g?.shipment || null;
        const c = this.code();
        this.traceUrl = `${location.origin}/traceability/${c}`;
        this.qrSrc = this.g?.qr_code && String(this.g.qr_code).startsWith('data:') ? this.g.qr_code
          : `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(this.traceUrl)}`;
        if (!this.packages.length) this.api.get(`/export-groups/${id}/packages`).subscribe({ next: (p: any) => { this.packages = p?.data ?? p ?? []; }, error: () => {} });
      }, error: () => {}
    });
  }
  makePackages() {
    const id = this.route.snapshot.paramMap.get('id');
    const total = +(this.g?.total_quantity || this.g?.quantity || 700);
    const n = Math.max(1, +this.pkgCount || 1);
    const each = Math.round((total / n) * 10) / 10;
    this.api.post(`/export-groups/${id}/packages`, { count: n, weight_each: each, packages: Array.from({ length: n }, (_, i) => ({ package_number: `PKG-${i + 1}`, weight: each })) }).subscribe({
      next: () => { this.toast.ok('Packages created'); this.ngOnInit(); }, error: (e) => this.toast.err(e?.error?.message || 'Pack failed')
    });
  }
  downloadReport() {
    const id = this.g?.export_group_id || this.route.snapshot.paramMap.get('id');
    this.api.get(`/reports/export/${id}`).subscribe({
      next: (d: any) => {
        const blob = new Blob([typeof d === 'string' ? d : JSON.stringify(d, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = `traceability-${this.code()}.json`; a.click();
      }, error: () => this.toast.err('Report failed')
    });
  }
}
