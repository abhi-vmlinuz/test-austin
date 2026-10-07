import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <h1 class="text-2xl font-extrabold text-navy mb-4">Export Documents</h1>
  <div class="card max-w-xl mb-4"><h3 class="font-bold text-navy mb-2">Upload document metadata</h3>
    <div class="grid grid-cols-2 gap-2">
      <input class="input" [(ngModel)]="m.export_group_id" placeholder="Export group id" />
      <select class="input" [(ngModel)]="m.document_type"><option *ngFor="let t of types" [value]="t">{{ t }}</option></select>
      <input class="input" [(ngModel)]="m.document_number" placeholder="INV-2026-001" />
      <input class="input" [(ngModel)]="m.document_path" placeholder="file path / URL" />
    </div>
    <button (click)="up()" class="btn-ocean mt-2">Save document</button></div>
  <div class="table-wrap"><table class="data"><thead><tr><th>Type</th><th>Number</th><th>Export group</th><th>Status</th></tr></thead>
  <tbody><tr *ngFor="let d of rows"><td>{{ d.document_type }}</td><td>{{ d.document_number }}</td><td>{{ d.export_group_id }}</td><td>{{ d.status }}</td></tr></tbody></table></div>`
})
export class DocumentsComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  types = ['Invoice', 'Packing List', 'Quality Report', 'Traceability Report', 'Shipping Document', 'Required Certificate', 'Other'];
  m: any = { document_type: 'Invoice' }; rows: any[] = [];
  ngOnInit() { this.api.get('/documents').subscribe({ next: (d: any) => { this.rows = d?.data ?? d ?? []; }, error: () => {} }); }
  up() { this.api.post('/documents', this.m).subscribe({ next: () => { this.toast.ok('Document saved'); this.ngOnInit(); }, error: (e) => this.toast.err(e?.error?.message || 'Failed') }); }
}
