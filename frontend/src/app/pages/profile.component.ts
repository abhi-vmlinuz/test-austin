import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
  <h1 class="text-2xl font-extrabold text-navy mb-4">Profile</h1>
  <div class="card max-w-md"><div class="text-sm text-slate-500">Name</div><div class="font-bold text-navy">{{ auth.user?.name }}</div>
  <div class="text-sm text-slate-500 mt-2">Email</div><div class="font-bold">{{ auth.user?.email }}</div>
  <div class="text-sm text-slate-500 mt-2">Role</div><div class="font-bold">{{ auth.role }}</div>
  <button (click)="auth.logout()" class="btn-outline mt-4">Logout</button></div>`
})
export class ProfileComponent {
  auth = inject(AuthService);
}
