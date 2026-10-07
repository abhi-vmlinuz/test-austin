import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-storage',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="mo-wrap">
    <div class="mo-head">
      <div class="mo-topline"><h1 class="mo-title">Allocate storage</h1><span class="mo-brand">MARINE ORIGIN</span></div>
      <div class="mo-sub">{{ focusGroup ? (focusGroup.inventory_group_code || focusGroup.code) : 'Select graded stock, then a freezer' }}</div>
    </div>

    <div *ngIf="!focusGroup">
      <h2 class="mo-sec">Graded stock</h2>
      <div class="mo-stack">
        <button *ngFor="let g of stock" (click)="focus(g)" class="mo-card mo-row text-left" style="width:100%;">
          <div class="flex-1 min-w-0">
            <div class="mo-code">{{ g.inventory_group_code || g.code }}</div>
            <div class="mo-name" style="font-size:1.4rem;">{{ g.species }}</div>
            <div class="mo-qty" style="font-size:1.1rem;">{{ fmtQty(g.available_quantity ?? g.quantity) }} kg • Frozen</div>
          </div>
          <span class="mo-pill" [ngClass]="gradeClass(+g.quality_score || +g.score || 0)">{{ gradeLabel(+g.quality_score || +g.score || 0) }}</span>
        </button>
        <div *ngIf="!stock.length" class="mo-card text-center text-sm" style="color:#5B6B7E;">No graded stock available.</div>
      </div>
    </div>

    <div *ngIf="focusGroup">
      <button (click)="focusGroup = null; selFreezer = null" class="text-sm font-bold" style="color:#2173B5;">← All stock</button>
      <div class="mo-countrow" style="margin-top:.8rem;margin-bottom:.4rem;">
        <span class="mo-pill" [ngClass]="gradeClass(+focusGroup.quality_score || +focusGroup.score || 0)">{{ gradeLabel(+focusGroup.quality_score || +focusGroup.score || 0) }}</span>
      </div>
      <div class="mo-name" style="font-size:1.5rem;">{{ fmtQty(focusGroup.available_quantity ?? focusGroup.quantity) }} kg • Frozen</div>
      <h2 class="mo-sec">Compatible storage</h2>
      <div class="mo-stack">
        <button *ngFor="let s of locs" (click)="selFreezer = s" class="mo-card text-left" style="width:100%;" [ngClass]="selFreezer === s ? 'mo-selcard' : ''">
          <div class="mo-row">
            <div class="flex-1 min-w-0">
              <div class="font-extrabold" style="color:#101828;font-size:1.15rem;letter-spacing:.02em;">{{ (s.freezer_code || s.code || '').toUpperCase() }}</div>
              <div class="font-extrabold" style="color:#101828;font-size:1.5rem;margin-top:.15rem;">{{ s.temperature || '-18 °C' }}</div>
              <div style="color:#141E2E;font-size:1.05rem;margin-top:.15rem;">{{ fmtQty(free(s)) }} kg free</div>
            </div>
            <div class="text-right" style="color:#101828;font-size:1.05rem;">Capacity {{ fmtQty(s.capacity || 2000) }} kg</div>
          </div>
        </button>
      </div>
      <button (click)="allocate()" [disabled]="!selFreezer" class="mo-cta">Allocate to {{ freezerName(selFreezer) }}</button>
      <div *ngIf="amsg" class="mo-note">{{ amsg }}</div>

      <div class="mo-card" style="margin-top:1.25rem;">
        <h3 class="font-bold" style="color:#101828;">Move inventory between freezers</h3>
        <div><label class="mo-label">Inventory group ID/code</label><input class="mo-input" [(ngModel)]="m.inventory_group_id" placeholder="IG-001" /></div>
        <div><label class="mo-label">To freezer</label><input class="mo-input" [(ngModel)]="m.storage_id" placeholder="F-03" /></div>
        <div><label class="mo-label">Quantity kg</label><input class="mo-input" type="number" [(ngModel)]="m.quantity" /></div>
        <div><label class="mo-label">Temperature</label><input class="mo-input" [(ngModel)]="m.temperature" placeholder="-18 °C" /></div>
        <button (click)="move()" class="mo-ghost">Move</button>
        <div *ngIf="msg" class="mo-note">{{ msg }}</div>
      </div>
    </div>

    <div *ngIf="!focusGroup" class="mo-card" style="margin-top:1.25rem;">
      <h3 class="font-bold" style="color:#101828;">Move inventory between freezers</h3>
      <div><label class="mo-label">Inventory group ID/code</label><input class="mo-input" [(ngModel)]="m.inventory_group_id" placeholder="IG-001" /></div>
      <div><label class="mo-label">To freezer</label><input class="mo-input" [(ngModel)]="m.storage_id" placeholder="F-03" /></div>
      <div><label class="mo-label">Quantity kg</label><input class="mo-input" type="number" [(ngModel)]="m.quantity" /></div>
      <div><label class="mo-label">Temperature</label><input class="mo-input" [(ngModel)]="m.temperature" placeholder="-18 °C" /></div>
      <button (click)="move()" class="mo-ghost">Move</button>
      <div *ngIf="msg" class="mo-note">{{ msg }}</div>
    </div>
  </div>`
})
export class StorageComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  locs: any[] = []; stock: any[] = [];
  focusGroup: any = null; selFreezer: any = null; amsg = '';
  m: any = { temperature: '-18 °C' }; msg = '';
  ngOnInit() {
    this.api.get('/storage').subscribe({ next: (d: any) => { this.locs = d?.data ?? d?.rows ?? d ?? []; }, error: () => {} });
    this.api.get('/inventory').subscribe({ next: (d: any) => { this.stock = (d?.data ?? d?.rows ?? d ?? []).filter((g: any) => ['AVAILABLE', 'USABLE'].includes(String(g.status || '').toUpperCase())); }, error: () => {} });
  }
  fmtQty(q: any) { return (+q || 0).toLocaleString('en-IN'); }
  occ(s: any) { return Math.min(100, ((+s.current_occupancy || +s.occupancy || 0) / (+s.capacity || 2000)) * 100); }
  free(s: any) { return Math.max(0, (+s.capacity || 2000) - (+s.current_occupancy || +s.occupancy || 0)); }
  focus(g: any) { this.focusGroup = g; this.selFreezer = null; this.amsg = ''; window.scrollTo({ top: 0, behavior: 'smooth' }); }
  freezerName(s: any) { return s ? (s.freezer_code || s.code || s.storage_id || 'freezer') : 'a freezer'; }
  gradeLabel(s: number) {
    if (s >= 9) return 'PREMIUM EXPORT';
    if (s >= 8) return 'EXPORT READY';
    if (s >= 6) return 'USABLE';
    return 'NON-USABLE';
  }
  gradeClass(s: number) {
    if (s >= 9) return 'mo-mint';
    if (s >= 8) return 'mo-sky';
    if (s >= 6) return 'mo-aqua';
    return 'mo-rose';
  }
  allocate() {
    if (!this.focusGroup || !this.selFreezer) return;
    const gid = this.focusGroup.inventory_group_id || this.focusGroup.id || this.focusGroup.inventory_group_code;
    const sid = this.selFreezer.storage_id || this.selFreezer.id || this.selFreezer.freezer_code || this.selFreezer.code;
    this.api.post('/storage/move', {
      inventory_group_id: gid, storage_id: sid,
      quantity: +(this.focusGroup.available_quantity ?? this.focusGroup.quantity ?? 0),
      temperature: this.selFreezer.temperature || '-18 °C'
    }).subscribe({
      next: () => { this.amsg = `Allocated to ${this.freezerName(this.selFreezer)}.`; this.toast.ok('Inventory allocated'); },
      error: (e) => { this.amsg = e?.error?.message || 'Allocation failed'; }
    });
  }
  move() {
    this.api.post('/storage/move', this.m).subscribe({
      next: () => { this.msg = 'Moved. History preserved.'; this.toast.ok('Inventory moved'); },
      error: (e) => { this.msg = e?.error?.message || 'Move failed'; }
    });
  }
}
