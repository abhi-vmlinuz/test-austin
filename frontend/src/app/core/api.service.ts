import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export const API_BASE = 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  get(path: string, params?: any) { return this.http.get<any>(`${API_BASE}${path}`, { params }); }
  post(path: string, body?: any) { return this.http.post<any>(`${API_BASE}${path}`, body ?? {}); }
  put(path: string, body?: any) { return this.http.put<any>(`${API_BASE}${path}`, body ?? {}); }
  delete(path: string) { return this.http.delete<any>(`${API_BASE}${path}`); }
}
