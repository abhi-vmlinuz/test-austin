import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, from, throwError } from 'rxjs';
import { outboxAdd } from './outbox-store';
import { ToastService } from './toast.service';
import { SyncService } from './sync.service';

export const API_BASE = 'http://localhost:3000/api';

type MutateMethod = 'POST' | 'PUT' | 'DELETE';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private sync = inject(SyncService);

  /** Reactive connectivity flag: initial value + online/offline events. */
  online = signal(navigator.onLine);

  constructor() {
    window.addEventListener('online', () => this.online.set(true));
    window.addEventListener('offline', () => this.online.set(false));
  }

  get(path: string, params?: any) { return this.http.get<any>(`${API_BASE}${path}`, { params }); }

  post(path: string, body?: any, opts?: { direct?: boolean }) { return this.mutate('POST', path, body, opts); }
  put(path: string, body?: any, opts?: { direct?: boolean }) { return this.mutate('PUT', path, body, opts); }
  delete(path: string, opts?: { direct?: boolean }) { return this.mutate('DELETE', path, undefined, opts); }

  private mutate(method: MutateMethod, path: string, body?: any, opts?: { direct?: boolean }): Observable<any> {
    // Auth calls bypass the offline outbox: a queued login is never a login.
    if (opts?.direct) {
      const url = `${API_BASE}${path}`;
      if (method === 'PUT') return this.http.put<any>(url, body ?? {});
      if (method === 'DELETE') return this.http.delete<any>(url);
      return this.http.post<any>(url, body ?? {});
    }
    if (!navigator.onLine) return this.enqueue(method, path, body);
    let req$: Observable<any>;
    const url = `${API_BASE}${path}`;
    if (method === 'PUT') req$ = this.http.put<any>(url, body ?? {});
    else if (method === 'DELETE') req$ = this.http.delete<any>(url);
    else req$ = this.http.post<any>(url, body ?? {});
    return req$.pipe(
      catchError((err) => (this.isNetworkError(err) ? this.enqueue(method, path, body) : throwError(() => err)))
    );
  }

  private isNetworkError(err: any): boolean {
    // HttpClient surfaces transport failures (DNS, refused, offline fetch)
    // with status 0; anything else is a real server response — rethrow.
    return !navigator.onLine || err?.status === 0;
  }

  private enqueue(method: MutateMethod, path: string, body?: any): Observable<any> {
    return from(
      outboxAdd({ method, path, body }).then(async (id) => {
        this.toast.info('Saved offline — will sync when connected.');
        await this.sync.refreshCount();
        return { queued: true, outboxId: id };
      })
    );
  }
}
