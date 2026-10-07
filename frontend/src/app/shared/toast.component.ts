import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="fixed bottom-4 right-4 z-[100] space-y-2 w-80">
    <div *ngFor="let t of svc.toasts$ | async"
      class="rounded-xl shadow-lg border px-4 py-3 text-sm flex items-start gap-2 bg-white"
      [ngClass]="{'border-emerald-200': t.kind==='ok','border-rose-200': t.kind==='err','border-sky-200': t.kind==='info'}">
      <span class="font-bold" [ngClass]="{'text-emerald-600': t.kind==='ok','text-rose-600': t.kind==='err','text-sky-600': t.kind==='info'}">
        {{ t.kind==='ok' ? '✓' : t.kind==='err' ? '!' : 'i' }}
      </span>
      <span class="flex-1">{{ t.msg }}</span>
      <button (click)="svc.dismiss(t.id)" class="text-slate-400">✕</button>
    </div>
  </div>`
})
export class ToastComponent {
  svc = inject(ToastService);
}
