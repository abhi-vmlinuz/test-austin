import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="min-h-screen flex bg-white">
    <div class="w-full lg:w-[46%] flex items-center justify-center p-6 md:p-12">
      <div class="w-full max-w-md">
        <div class="flex items-center gap-2 font-extrabold text-navy text-lg"><span class="w-9 h-9 rounded-xl bg-ocean text-white flex items-center justify-center" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4.8" r="2.3"/><path d="M12 7.1V21"/><path d="M8.5 10.5h7"/><path d="M5 13.5c0 3.8 3 6.5 7 6.5s7-2.7 7-6.5"/><path d="M5 13.5 2.6 13M5 13.5l.4-2.4M19 13.5l2.4-.5M19 13.5l-.4-2.4"/></svg></span> Marine Origin</div>
        <h1 class="text-3xl font-extrabold text-navy mt-8">Start your journey</h1>
        <p class="text-slate-500 mt-1 mb-6">Sign in to Marine Origin</p>
        <form (ngSubmit)="submit()" class="space-y-4">
          <div>
            <label class="label" for="email">E-mail</label>
            <div class="relative"><span class="absolute left-3 top-2.5 text-slate-400" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg></span>
            <input id="email" class="input !pl-10" [(ngModel)]="email" name="email" type="email" required autocomplete="email" /></div>
          </div>
          <div>
            <label class="label" for="password">Password</label>
            <div class="relative"><span class="absolute left-3 top-2.5 text-slate-400" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></span>
            <input id="password" class="input !pl-10" [(ngModel)]="password" name="password" type="password" required autocomplete="current-password" /></div>
          </div>
          <div *ngIf="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{{ error }}</div>
          <button class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl" [disabled]="busy">{{ busy ? 'Signing in…' : 'Sign In' }}</button>
        </form>
        <div class="mt-6">
          <div class="text-xs font-bold text-slate-500 mb-2">Continue as</div>
          <div class="flex flex-wrap gap-2">
            <button *ngFor="let r of roles" (click)="quick(r)" class="text-[11px] font-bold border border-slate-200 rounded-full px-3 py-1.5 hover:bg-slate-50">{{ roleLabel(r) }}</button>
          </div>
        </div>
        <p class="text-sm text-slate-500 mt-6">New here? <a routerLink="/register" class="text-blue-600 font-bold">Create account</a> • <a routerLink="/" class="text-blue-600 font-bold">Home</a></p>
      </div>
    </div>
    <div class="hidden lg:block lg:w-[54%] relative"><img src="assets/login-side.png" alt="Marine Origin" class="absolute inset-0 w-full h-full object-cover" />
      <div class="absolute inset-0 bg-gradient-to-t from-navy-900/70 to-transparent"></div>
      <div class="absolute bottom-8 left-8 right-8 text-white"><div class="font-extrabold text-xl">Every kilogram has a digital identity.</div><div class="text-sm text-slate-200">Kochi → Hamburg • QR provenance • AIR / SEA</div></div>
    </div>
  </div>`
})
export class LoginComponent {
  private auth = inject(AuthService);
  toast = inject(ToastService);
  private router = inject(Router);
  email = ''; password = ''; busy = false; error = '';
  roles = ['ADMIN', 'SOURCE_OPERATOR', 'PROCESSOR', 'QUALITY_INSPECTOR', 'EXPORTER', 'IMPORTER'];
  roleLabel(role: string) {
    return role.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  }
  quick(role: string) {
    const map: any = { ADMIN: 'admin@example.com', SOURCE_OPERATOR: 'source@example.com', PROCESSOR: 'processor@example.com', QUALITY_INSPECTOR: 'inspector@example.com', EXPORTER: 'exporter@example.com', IMPORTER: 'importer@example.com' };
    this.email = map[role] || 'admin@example.com';
    this.password = 'Password123!';
  }
  submit() {
    if (!navigator.onLine) { this.error = 'You are offline. Reconnect to sign in.'; return; }
    this.busy = true; this.error = '';
    this.auth.login(this.email, this.password).subscribe({
      next: () => { this.busy = false; this.toast.ok('Welcome back'); this.auth.redirectByRole(); },
      error: (e) => { this.busy = false; this.error = e?.error?.message || e?.error?.error || 'Login failed. Check your email and password and try again.'; }
    });
  }
}
