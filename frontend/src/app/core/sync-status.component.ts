import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from './api.service';
import { SyncService } from './sync.service';

@Component({
  selector: 'app-sync-status',
  standalone: true,
  imports: [CommonModule],
  template: `
  <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-[#071A2E]/90"
    [ngClass]="api.online() ? 'text-emerald-300' : 'text-amber-300'">
    <span class="inline-block h-2 w-2 rounded-full"
      [ngClass]="api.online() ? 'bg-emerald-400' : 'bg-amber-400'"></span>
    {{ api.online() ? 'Online' : 'Offline — ' + sync.pendingCount() + ' change(s) waiting' }}
  </span>`
})
export class SyncStatusComponent {
  api = inject(ApiService);
  sync = inject(SyncService);
}
