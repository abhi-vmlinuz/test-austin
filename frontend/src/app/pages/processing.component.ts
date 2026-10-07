import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-processing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="mo-wrap">
    <div class="mo-head">
      <div class="mo-topline"><h1 class="mo-title">{{ sel ? 'Process batch' : 'Processing tasks' }}</h1><span class="mo-brand">MARINE ORIGIN</span></div>
      <div class="mo-sub">{{ sel ? (sel.batch_code || sel.code) : (auth.role + ' • Kochi') }}</div>
    </div>

    <div *ngIf="!sel">
      <div class="mo-countrow"><span class="mo-pill mo-cyan">{{ batches.length }} pending</span></div>
      <div class="mo-stack">
        <button *ngFor="let b of batches" (click)="pick(b)" class="mo-card mo-row text-left" style="width:100%;">
          <div class="flex-1 min-w-0">
            <div class="mo-code">{{ b.batch_code || b.code }}</div>
            <div class="mo-name" style="font-size:1.55rem;">{{ b.species }}</div>
            <div class="mo-qty">{{ fmtQty(b.original_quantity || b.quantity || b.remaining_quantity) }} kg</div>
          </div>
          <span class="mo-pill" [ngClass]="queuePill(b.status)">{{ queueLabel(b.status) }}</span>
        </button>
        <div *ngIf="!batches.length" class="mo-card text-center text-sm" style="color:#5B6B7E;">No batches available.</div>
      </div>
    </div>

    <div *ngIf="sel">
      <button (click)="sel = null" class="text-sm font-bold" style="color:#2173B5;">← All tasks</button>
      <div class="mo-name" style="margin-top:.6rem;">{{ sel.species }} · {{ fmtQty(sel.original_quantity || sel.quantity) }} kg</div>
      <h2 class="mo-sec">Processing output</h2>
      <div><label class="mo-label">Input quantity</label><input class="mo-input" [(ngModel)]="inputText" (input)="syncIn()" placeholder="2,430 kg" /></div>
      <div><label class="mo-label">Output quantity</label><input class="mo-input" [(ngModel)]="outputText" (input)="syncOut()" placeholder="2,060 kg" /></div>
      <div><label class="mo-label">Processing method</label><input class="mo-input" [(ngModel)]="m.method" placeholder="Frozen · Whole" /></div>
      <div><label class="mo-label">Temperature</label><input class="mo-input" [(ngModel)]="m.temperature" placeholder="-18 °C" /></div>
      <div class="mo-countrow" style="margin-top:1.2rem;margin-bottom:0;" *ngIf="loss() !== null">
        <span class="mo-pill mo-cyan">{{ fmtQty(loss()) }} kg processing loss</span>
      </div>
      <div *ngIf="mismatch() !== null && mismatch() !== 0" class="mo-err">Does not balance: output {{ fmtQty(m.output_quantity) }} + waste {{ fmtQty(m.waste_quantity) }} = {{ fmtQty((+m.output_quantity||0)+(+m.waste_quantity||0)) }} kg, but input is {{ fmtQty(m.input_quantity) }} kg.</div>
      <div *ngIf="mismatch() === 0" class="mo-note" style="color:#1F7A4D;font-weight:600;">Balanced: input = output + waste ({{ fmtQty(m.waste_quantity) }} kg).</div>
      <div><label class="mo-label">Waste (kg)</label><input class="mo-input" type="number" [(ngModel)]="m.waste_quantity" /></div>
      <div><label class="mo-label">Remarks</label><input class="mo-input" [(ngModel)]="m.remarks" /></div>
      <button (click)="complete()" class="mo-cta">Complete processing</button>
      <button (click)="start()" class="mo-ghost">Start processing</button>
      <div class="mo-note">Next: quality inspection</div>
      <div *ngIf="msg" class="mo-note">{{ msg }}</div>
      <div class="mo-row" style="justify-content:center;margin-top:1rem;" *ngIf="lastGid">
        <a [routerLink]="['/processing-groups', lastGid]" class="mo-link" style="color:#2173B5;">Open processing group →</a>
      </div>
    </div>

    <div style="margin-top:1.5rem;">
      <h2 class="mo-sec">Processing groups</h2>
      <div class="mo-stack">
        <a *ngFor="let g of groups" [routerLink]="['/processing-groups', gid(g)]" class="mo-card mo-row" style="text-decoration:none;">
          <div class="flex-1 min-w-0">
            <div class="mo-code">{{ g.processing_group_code || g.code }}</div>
            <div class="mo-name" style="font-size:1.3rem;">{{ g.species }}</div>
            <div class="mo-qty" style="font-size:1.1rem;">{{ fmtQty(g.quantity) }} kg</div>
          </div>
          <span class="mo-pill mo-sky">{{ g.status || 'WAITING' }}</span>
        </a>
      </div>
    </div>
  </div>`
})
export class ProcessingComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  auth = inject(AuthService);
  batches: any[] = []; groups: any[] = []; sel: any = null; msg = ''; lastGid: any = null;
  m: any = { processing_type: 'Cleaning + De-heading + Peeling + Freezing', method: 'Frozen · Whole', temperature: '-18 °C', input_quantity: 800, output_quantity: 760, waste_quantity: 40, remarks: '' };
  inputText = '800 kg';
  outputText = '760 kg';
  ngOnInit() {
    this.api.get('/raw-batches').subscribe({ next: (d: any) => { this.batches = (d?.data ?? d?.rows ?? d ?? []).filter((b: any) => ['AVAILABLE', 'CREATED', 'PROCESSING'].includes(String(b.status).toUpperCase())); }, error: () => {} });
    this.api.get('/processing-groups').subscribe({ next: (d: any) => { this.groups = d?.data ?? d?.rows ?? d ?? []; }, error: () => {} });
  }
  gid(g: any) { return g.processing_group_id || g.id || g.processing_group_code; }
  fmtQty(q: any) { return (+q || 0).toLocaleString('en-IN'); }
  queueLabel(s: any) {
    const u = String(s || '').toUpperCase();
    if (u === 'CREATED') return 'New request';
    if (u === 'AVAILABLE') return 'Awaiting intake';
    return 'Ready to process';
  }
  queuePill(s: any) {
    const u = String(s || '').toUpperCase();
    if (u === 'PROCESSING') return 'mo-mint';
    return 'mo-cyan';
  }
  pick(b: any) {
    this.sel = b; this.msg = ''; this.lastGid = null;
    const q = +(b.original_quantity || b.quantity || b.remaining_quantity || 0);
    this.m.input_quantity = q; this.inputText = this.fmtQty(q) + ' kg';
    this.m.output_quantity = ''; this.outputText = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  syncIn() { const n = parseInt(this.inputText.replace(/[^0-9]/g, ''), 10); this.m.input_quantity = isNaN(n) ? '' : n; }
  syncOut() {
    const n = parseInt(this.outputText.replace(/[^0-9]/g, ''), 10);
    this.m.output_quantity = isNaN(n) ? '' : n;
    // Waste defaults to the measured loss so the pill and the field never disagree;
    // the user can still override waste manually (mismatch will flag any imbalance).
    const l = this.loss();
    if (l !== null && l >= 0) this.m.waste_quantity = l;
  }
  loss(): number | null {
    if (this.m.input_quantity === '' || this.m.input_quantity == null || this.m.output_quantity === '' || this.m.output_quantity == null) return null;
    return +this.m.input_quantity - (+this.m.output_quantity || 0);
  }
  mismatch(): number | null {
    if (this.m.input_quantity === '' || this.m.input_quantity == null) return null;
    return +this.m.input_quantity - ((+this.m.output_quantity || 0) + (+this.m.waste_quantity || 0));
  }
  start() {
    if (!this.sel) { this.msg = 'Select an incoming raw batch first.'; return; }
    if (this.mismatch() !== 0) { this.msg = 'Blocked: input must equal output + waste.'; return; }
    const id = this.sel.raw_batch_id || this.sel.id || this.sel.batch_code;
    this.api.post('/processing', { raw_batch_id: id, ...this.m }).subscribe({
      next: (d: any) => { this.msg = 'Processing started: ' + JSON.stringify(d?.data?.processing_id || d?.processing_id || 'ok'); this.toast.ok('Processing started'); },
      error: (e) => { this.msg = e?.error?.message || 'Start failed'; }
    });
  }
  complete() {
    if (this.mismatch() !== 0) { this.msg = 'Blocked: input must equal output + waste.'; return; }
    this.api.post('/processing', { raw_batch_id: this.sel ? (this.sel.raw_batch_id || this.sel.id || this.sel.batch_code) : undefined, ...this.m, complete: true }).subscribe({
      next: (d: any) => {
        const pid = d?.data?.processing_id || d?.processing_id || d?.data?.id;
        this.msg = 'Sent to quality inspection.';
        if (pid) { this.lastGid = pid; this.api.post(`/processing/${pid}/complete`, {}).subscribe({ next: () => this.toast.ok('Sent to quality inspection.'), error: () => this.toast.ok('Processing saved') }); }
        else this.toast.ok('Sent to quality inspection.');
      },
      error: (e) => { this.msg = e?.error?.message || 'Complete failed'; }
    });
  }
}
