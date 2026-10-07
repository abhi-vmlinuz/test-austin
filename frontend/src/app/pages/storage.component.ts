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
  <h1 class="text-2xl font-extrabold text-navy mb-4">Cold Storage</h1>
  <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
    <div class="card" *ngFor="let s of locs">
      <div class="text-lg font-extrabold text-navy">🧊 {{ s.freezer_code || s.code }}</div>
      <div class="text-xs text-slate-500">{{ s.facility_name || s.facility }} • {{ s.temperature || '-18°C' }}</div>
      <div class="h-2 bg-slate-100 rounded-full mt-2"><div class="h-2 bg-ocean rounded-full" [style.width.%]="occ(s)"></div></div>
      <div class="text-xs mt-1">{{ s.current_occupancy || s.occupancy || 0 }} / {{ s.capacity || 2000 }} kg</div>
    </div>
  </div>
  <div class="card mt-4 max-w-xl"><h3 class="font-bold text-navy mb-3">Move inventory between freezers</h3>
    <div class="grid grid-cols-2 gap-2">
      <div><label class="label">Inventory group ID/code</label><input class="input" [(ngModel)]="m.inventory_group_id" placeholder="IG-001" /></div>
      <div><label class="label">To freezer</label><input class="input" [(ngModel)]="m.storage_id" placeholder="F-03" /></div>
      <div><label class="label">Quantity kg</label><input class="input" type="number" [(ngModel)]="m.quantity" /></div>
      <div><label class="label">Temperature</label><input class="input" [(ngModel)]="m.temperature" placeholder="-18°C" /></div>
    </div>
    <button (click)="move()" class="btn-ocean mt-3">Move</button>
    <div *ngIf="msg" class="text-sm mt-2">{{ msg }}</div></div>`
})
export class StorageComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  locs: any[] = []; m: any = { temperature: '-18°C' }; msg = '';
  ngOnInit() { this.api.get('/storage').subscribe({ next: (d: any) => { this.locs = d?.data ?? d?.rows ?? d ?? []; }, error: () => {} }); }
  occ(s: any) { return Math.min(100, ((+s.current_occupancy || +s.occupancy || 0) / (+s.capacity || 2000)) * 100); }
  move() {
    this.api.post('/storage/move', this.m).subscribe({
      next: () => { this.msg = 'Moved. History preserved.'; this.toast.ok('Inventory moved'); },
      error: (e) => { this.msg = e?.error?.message || 'Move failed'; }
    });
  }
}
