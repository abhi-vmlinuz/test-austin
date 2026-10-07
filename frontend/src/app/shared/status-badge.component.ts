import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `<span [class]="'badge-' + norm(status)">{{ pretty(status) }}</span>`
})
export class StatusBadgeComponent {
  @Input() status = '';
  norm(s: string) { return String(s || 'CREATED').toUpperCase().replace(/ /g, '_'); }
  pretty(s: string) { return String(s || '').replace(/_/g, ' ').toUpperCase() || '—'; }
}
