import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TlStep { title: string; sub?: string; detail?: string; color?: string; done?: boolean; }

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="tl">
    <div class="tl-item" *ngFor="let s of steps">
      <span class="tl-dot" [style.borderColor]="s.color || '#00B4D8'"></span>
      <div class="text-sm font-bold text-navy">{{ s.title }}</div>
      <div class="text-sm text-slate-600" *ngIf="s.sub">{{ s.sub }}</div>
      <div class="text-xs text-slate-500 mt-0.5" *ngIf="s.detail">{{ s.detail }}</div>
    </div>
    <div *ngIf="!steps?.length" class="text-sm text-slate-400 pb-4">No timeline data.</div>
  </div>`
})
export class TimelineComponent {
  @Input() steps: TlStep[] = [];
}
