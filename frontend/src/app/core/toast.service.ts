import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast { id: number; kind: 'ok' | 'err' | 'info'; msg: string; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 1;
  toasts$ = new BehaviorSubject<Toast[]>([]);
  show(msg: string, kind: Toast['kind'] = 'ok') {
    const t = { id: this.seq++, kind, msg };
    this.toasts$.next([...this.toasts$.value, t]);
    setTimeout(() => this.dismiss(t.id), 3800);
  }
  ok(m: string) { this.show(m, 'ok'); }
  err(m: string) { this.show(m, 'err'); }
  info(m: string) { this.show(m, 'info'); }
  dismiss(id: number) { this.toasts$.next(this.toasts$.value.filter((t) => t.id !== id)); }
}
