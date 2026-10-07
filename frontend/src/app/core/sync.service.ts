import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from './api.service';
import { OutboxEntry, outboxBumpTries, outboxCount, outboxList, outboxRemove } from './outbox-store';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class SyncService {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  pendingCount = signal(0);
  private syncing = false;

  constructor() {
    void this.refreshCount();
    window.addEventListener('online', () => void this.sync());
    // Replay any queue left over from a previous session on startup.
    void this.sync();
  }

  async refreshCount(): Promise<void> {
    try {
      this.pendingCount.set(await outboxCount());
    } catch {
      // IndexedDB unavailable (private mode etc.) — badge just stays stale.
    }
  }

  async sync(): Promise<void> {
    if (this.syncing || !navigator.onLine) {
      await this.refreshCount();
      return;
    }
    this.syncing = true;
    try {
      const queue = await outboxList();
      let done = 0;
      for (const entry of queue) {
        try {
          await this.replay(entry);
          await outboxRemove(entry.id);
          done++;
        } catch (err: any) {
          await outboxBumpTries(entry.id);
          if (err?.status === 0 || !navigator.onLine) break; // connectivity dropped again; retry later
          this.toast.err(this.serverMessage(err));
        }
      }
      await this.refreshCount();
      if (done > 0) this.toast.ok(`Synced ${done} change(s).`);
    } finally {
      this.syncing = false;
    }
  }

  private serverMessage(err: any): string {
    const m = err?.error?.message ?? err?.message;
    return typeof m === 'string' && m ? m : 'Sync failed';
  }

  // NOTE on idempotency: at-least-once replay is safe here. The server
  // generates unique batch/order/tracking codes per insert (see backend
  // utils/codes.js: batchCode/orderCode + uniqueCode duplicate guard), so a
  // retried POST that actually landed is rejected as a duplicate rather than
  // creating a second row. PUT/DELETE replays are naturally idempotent.
  private replay(e: OutboxEntry): Promise<unknown> {
    const url = `${API_BASE}${e.path}`;
    switch (e.method) {
      case 'PUT':
        return firstValueFrom(this.http.put(url, e.body ?? {}));
      case 'DELETE':
        return firstValueFrom(this.http.delete(url));
      default:
        return firstValueFrom(this.http.post(url, e.body ?? {}));
    }
  }
}
