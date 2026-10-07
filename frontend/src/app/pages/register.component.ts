import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="min-h-screen flex bg-white">
    <div class="w-full lg:w-[46%] flex items-center justify-center p-6 md:p-12">
      <div class="w-full max-w-md">
        <div class="flex items-center gap-2 font-extrabold text-navy text-lg"><span class="w-9 h-9 rounded-xl bg-ocean text-white flex items-center justify-center">⚓</span> Catch2Export</div>
        <h1 class="text-3xl font-extrabold text-navy mt-8">Join the chain</h1>
        <p class="text-slate-500 mt-1 mb-6">Sign up for Catch2Export</p>
        <form (ngSubmit)="submit()" class="space-y-4">
          <div><label class="label">Full name</label><input class="input" [(ngModel)]="name" name="name" required placeholder="Asha Menon" /></div>
          <div><label class="label">E-mail</label><input class="input" [(ngModel)]="email" name="email" type="email" required placeholder="you@company.com" /></div>
          <div><label class="label">Password</label><input class="input" [(ngModel)]="password" name="password" type="password" required placeholder="min 6 characters" /></div>
          <div><label class="label">Role</label>
            <select class="input" [(ngModel)]="role" name="role">
              <option *ngFor="let r of roles" [value]="r">{{ r }}</option>
            </select></div>
          <div *ngIf="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{{ error }}</div>
          <button class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl" [disabled]="busy">{{ busy ? 'Creating…' : 'Sign Up' }}</button>
        </form>
        <p class="text-sm text-slate-500 mt-6">Have an account? <a routerLink="/login" class="text-blue-600 font-bold">Sign in</a></p>
      </div>
    </div>
    <div class="hidden lg:block lg:w-[54%] relative"><img src="assets/login-side.png" alt="Catch2Export" class="absolute inset-0 w-full h-full object-cover" />
      <div class="absolute inset-0 bg-gradient-to-t from-navy-900/70 to-transparent"></div>
      <div class="absolute bottom-8 left-8 right-8 text-white"><div class="font-extrabold text-xl">From Raw Batch to Export Shipment.</div><div class="text-sm text-slate-200">Quality scoring • smart allocation • QR provenance</div></div>
    </div>
  </div>`
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);
  name = ''; email = ''; password = ''; role = 'IMPORTER'; busy = false; error = '';
  roles = ['ADMIN', 'SOURCE_OPERATOR', 'PROCESSOR', 'QUALITY_INSPECTOR', 'EXPORTER', 'IMPORTER'];
  submit() {
    this.busy = true; this.error = '';
    this.auth.register(this.name, this.email, this.password, this.role).subscribe({
      next: () => { this.busy = false; this.toast.ok('Account created'); this.auth.redirectByRole(); },
      error: (e) => { this.busy = false; this.error = e?.error?.message || e?.error?.error || 'Registration failed'; }
    });
  }
}
