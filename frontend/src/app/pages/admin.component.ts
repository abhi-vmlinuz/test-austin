import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <h1 class="text-2xl font-extrabold text-navy mb-1">Admin Console</h1>
  <p class="text-sm text-slate-500 mb-4">Users • vessels • harbours • facilities • shipping rules • products • audit logs • settings (USABLE_THRESHOLD).</p>
  <div class="flex flex-wrap gap-2 mb-4">
    <button *ngFor="let t of tabs" (click)="tab = t" class="text-xs font-bold px-3 py-2 rounded-lg border"
      [ngClass]="tab === t ? 'bg-navy text-white' : 'bg-white'">{{ t }}</button>
  </div>
  <div class="card">
    <div *ngIf="tab === 'Users'"><div *ngFor="let u of users" class="flex gap-2 text-sm py-2 border-b border-slate-100">
      <b>{{ u.name }}</b><span class="text-slate-500">{{ u.email }} • {{ u.role }}</span>
      <select [(ngModel)]="u.role" class="input !w-44 !py-1 ml-auto"><option *ngFor="let r of roles" [value]="r">{{ r }}</option></select>
      <button (click)="saveUser(u)" class="btn-outline !py-1">Save</button></div></div>
    <div *ngIf="tab === 'Vessels'"><div class="flex gap-2 mb-2"><input class="input" [(ngModel)]="v.vessel_name" placeholder="Ocean Star" /><input class="input" [(ngModel)]="v.registration_number" placeholder="KL-07-1024" /><button (click)="addVessel()" class="btn-ocean">Add</button></div>
      <div *ngFor="let x of vessels" class="text-sm py-1.5 border-b border-slate-100">{{ x.vessel_name }} • {{ x.registration_number }}</div></div>
    <div *ngIf="tab === 'Harbours'"><div class="flex gap-2 mb-2"><input class="input" [(ngModel)]="h.harbour_name" placeholder="Kochi Harbour" /><input class="input" [(ngModel)]="h.location" placeholder="Kerala" /><button (click)="addHarbour()" class="btn-ocean">Add</button></div>
      <div *ngFor="let x of harbours" class="text-sm py-1.5 border-b border-slate-100">{{ x.harbour_name }} • {{ x.location }}</div></div>
    <div *ngIf="tab === 'Facilities'"><div class="flex gap-2 mb-2"><input class="input" [(ngModel)]="f.facility_name" placeholder="Kerala Seafood Processing Centre" /><input class="input" [(ngModel)]="f.freezer_code" placeholder="F-01" /><input class="input" [(ngModel)]="f.capacity" placeholder="2000" /><button (click)="addFacility()" class="btn-ocean">Add</button></div>
      <div *ngFor="let x of facilities" class="text-sm py-1.5 border-b border-slate-100">{{ x.facility_name }} • {{ x.freezer_code }} • {{ x.capacity }}kg</div></div>
    <div *ngIf="tab === 'Shipping rules'"><div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <input class="input" [(ngModel)]="r.species" placeholder="Shrimp" /><select class="input" [(ngModel)]="r.shipping_method"><option>SEA</option><option>AIR</option></select>
        <input class="input" [(ngModel)]="r.destination_country" placeholder="Germany" />
        <select class="input" [(ngModel)]="r.allowed"><option value="true">Allowed</option><option value="false">Blocked</option></select></div>
      <button (click)="addRule()" class="btn-ocean">Save rule</button>
      <div *ngFor="let x of rules" class="text-sm py-1.5 border-b border-slate-100">{{ x.species }} • {{ x.shipping_method }} • {{ x.destination_country }} • {{ x.allowed ? 'ALLOWED' : 'BLOCKED' }}</div></div>
    <div *ngIf="tab === 'Products'"><div class="flex gap-2 mb-2"><input class="input" [(ngModel)]="p.name" placeholder="Shrimp" /><button (click)="addProduct()" class="btn-ocean">Add</button></div>
      <div *ngFor="let x of products" class="text-sm py-1.5 border-b border-slate-100">{{ x.name || x.species || (x | json).slice(0,80) }}</div></div>
    <div *ngIf="tab === 'Audit logs'"><div *ngFor="let a of audits" class="text-xs py-1.5 border-b border-slate-100">{{ a.timestamp || a.created_at }} • {{ a.action }} • {{ a.entity_type }} {{ a.entity_id }} • {{ a.user_id }}</div>
      <div *ngIf="!audits.length" class="text-sm text-slate-400">No audit entries.</div></div>
    <div *ngIf="tab === 'Settings'"><label class="label">USABLE_THRESHOLD (default 6)</label>
      <input class="input !w-40" type="number" [(ngModel)]="settings.USABLE_THRESHOLD" />
      <button (click)="saveSettings()" class="btn-ocean mt-2">Save settings</button>
      <div class="text-xs text-slate-500 mt-2">Score ≥ threshold = USABLE, below = NON-USABLE.</div></div>
  </div>`
})
export class AdminComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  tabs = ['Users', 'Vessels', 'Harbours', 'Facilities', 'Shipping rules', 'Products', 'Audit logs', 'Settings'];
  tab = 'Users'; roles = ['ADMIN', 'SOURCE_OPERATOR', 'PROCESSOR', 'QUALITY_INSPECTOR', 'EXPORTER', 'IMPORTER'];
  users: any[] = []; vessels: any[] = []; harbours: any[] = []; facilities: any[] = []; rules: any[] = []; products: any[] = []; audits: any[] = [];
  v: any = {}; h: any = {}; f: any = {}; r: any = { shipping_method: 'SEA', allowed: 'true' }; p: any = {};
  settings: any = { USABLE_THRESHOLD: 6 };
  ngOnInit() {
    const g = (path: string, cb: (v: any[]) => void) => this.api.get(path).subscribe({ next: (d: any) => cb(d?.data ?? d?.rows ?? (Array.isArray(d) ? d : [])), error: () => {} });
    g('/users', (v) => (this.users = v)); g('/vessels', (v) => (this.vessels = v)); g('/harbours', (v) => (this.harbours = v));
    g('/storage', (v) => (this.facilities = v)); g('/admin/shipping-rules', (v) => (this.rules = v));
    g('/products', (v) => (this.products = v)); g('/admin/audit-logs', (v) => (this.audits = v));
    this.api.get('/admin/settings').subscribe({ next: (d: any) => { this.settings = { ...this.settings, ...((d?.data ?? d) || {}) }; }, error: () => {} });
    this.api.get('/shipping-rules').subscribe({ next: (d: any) => { if (!this.rules.length) this.rules = d?.data ?? d ?? []; }, error: () => {} });
  }
  saveUser(u: any) { this.api.put(`/users/${u.user_id || u.id}`, { role: u.role }).subscribe({ next: () => this.toast.ok('Role updated'), error: (e) => this.toast.err(e?.error?.message || 'Failed') }); }
  addVessel() { this.api.post('/vessels', this.v).subscribe({ next: () => { this.toast.ok('Vessel added'); this.ngOnInit(); }, error: (e) => this.toast.err(e?.error?.message || 'Failed') }); }
  addHarbour() { this.api.post('/harbours', this.h).subscribe({ next: () => { this.toast.ok('Harbour added'); this.ngOnInit(); }, error: (e) => this.toast.err(e?.error?.message || 'Failed') }); }
  addFacility() { this.api.post('/storage', this.f).subscribe({ next: () => { this.toast.ok('Facility added'); this.ngOnInit(); }, error: (e) => this.toast.err(e?.error?.message || 'Failed') }); }
  addRule() { this.api.post('/admin/shipping-rules', { ...this.r, allowed: this.r.allowed === 'true' || this.r.allowed === true }).subscribe({ next: () => { this.toast.ok('Rule saved'); this.ngOnInit(); }, error: () => this.api.post('/shipping-rules', this.r).subscribe({ next: () => this.toast.ok('Rule saved'), error: (e) => this.toast.err(e?.error?.message || 'Failed') }) }); }
  addProduct() { this.api.post('/products', this.p).subscribe({ next: () => { this.toast.ok('Product added'); this.ngOnInit(); }, error: (e) => this.toast.err(e?.error?.message || 'Failed') }); }
  saveSettings() { this.api.post('/admin/settings', this.settings).subscribe({ next: () => this.toast.ok('Settings saved'), error: () => this.api.put('/admin/settings', this.settings).subscribe({ next: () => this.toast.ok('Settings saved'), error: (e) => this.toast.err(e?.error?.message || 'Failed') }) }); }
}
