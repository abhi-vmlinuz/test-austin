import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterLink],
  template: `
  <div class="min-h-[60vh] flex items-center justify-center">
    <div class="card max-w-md w-full text-center border-t-4 !border-t-ocean">
      <div class="w-14 h-14 mx-auto rounded-2xl bg-navy text-white flex items-center justify-center" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/></svg>
      </div>
      <h1 class="text-2xl font-extrabold text-navy mt-4">Access denied</h1>
      <p class="text-sm text-slate-500 mt-2">Your role cannot open this area.</p>
      <div class="flex gap-2 justify-center mt-6">
        <a routerLink="/dashboard" class="btn-ocean">Dashboard</a>
        <button (click)="signOut()" class="btn-outline">Sign out</button>
      </div>
    </div>
  </div>`
})
export class ForbiddenComponent {
  private auth = inject(AuthService);
  signOut() {
    this.auth.logout();
  }
}
