import { AfterViewInit, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="relative min-h-svh bg-[#071A2E] text-white overflow-hidden flex flex-col">
    <video #heroVideo autoplay muted loop playsinline preload="auto" disablepictureinpicture
      class="absolute inset-0 w-full h-full object-cover" aria-hidden="true">
      <source src="assets/hero.mp4" type="video/mp4" />
    </video>
    <div class="absolute inset-0 hero-overlay" aria-hidden="true"></div>

    <header class="relative z-10 w-full max-w-7xl mx-auto flex items-center justify-between px-5 md:px-10 py-5">
      <a routerLink="/" class="flex items-center gap-2.5 font-extrabold text-lg tracking-tight">
        <span class="w-9 h-9 rounded-[10px] bg-ocean flex items-center justify-center" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="4.8" r="2.3"/><path d="M12 7.1V21"/><path d="M8.5 10.5h7"/>
            <path d="M5 13.5c0 3.8 3 6.5 7 6.5s7-2.7 7-6.5"/><path d="M5 13.5 2.6 13M5 13.5l.4-2.4M19 13.5l2.4-.5M19 13.5l-.4-2.4"/>
          </svg>
        </span>
        Catch2Export
      </a>
      <nav class="flex items-center gap-1.5" aria-label="Primary">
        <a routerLink="/login" class="px-4 py-2.5 text-sm font-semibold text-white/85 hover:text-white rounded-lg whitespace-nowrap">Sign in</a>
        <a routerLink="/register" class="px-5 py-2.5 text-sm font-bold bg-ocean hover:bg-ocean-dark rounded-lg whitespace-nowrap">Get started</a>
      </nav>
    </header>

    <main class="relative z-10 flex-1 flex items-end w-full max-w-7xl mx-auto px-5 md:px-10 pb-10 md:pb-14">
      <div class="max-w-3xl entrance">
        <h1 class="text-[2.6rem] leading-[1.04] md:text-7xl font-extrabold tracking-[-0.03em] text-balance">Every kilogram has a digital identity.</h1>
        <p class="mt-5 text-base md:text-xl leading-relaxed text-slate-200 max-w-2xl">Catch-to-export traceability for seafood — raw batches, processing, quality scoring, and shipments in one unbroken chain of custody.</p>
        <div class="mt-8 flex flex-wrap items-center gap-3">
          <a routerLink="/register" class="px-7 py-3.5 font-bold bg-ocean hover:bg-ocean-dark rounded-xl">Get started</a>
          <a routerLink="/login" class="px-7 py-3.5 font-bold border border-white/35 hover:border-white/70 hover:bg-white/10 rounded-xl">Sign in</a>
        </div>
      </div>
    </main>

    <footer class="relative z-10 border-t border-white/15">
      <div class="w-full max-w-7xl mx-auto px-5 md:px-10 py-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <form (ngSubmit)="track()" class="flex items-center gap-2 w-full md:max-w-md">
          <label for="trace-code" class="sr-only">Track a batch, package, or export group</label>
          <input id="trace-code" [(ngModel)]="traceCode" name="traceCode" placeholder="Track RAW-SHR-001, IG-001, PKG-…"
            class="w-full bg-white/10 border border-white/25 placeholder:text-slate-300/70 text-sm rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-ocean focus:border-ocean" />
          <button type="submit" class="shrink-0 px-4 py-2.5 text-sm font-bold border border-white/25 hover:bg-white/10 rounded-lg">Track</button>
        </form>
        <p class="text-xs text-slate-300/80">Catch2Export &middot; Kochi &rarr; Hamburg &middot; AIR / SEA</p>
      </div>
    </footer>
  </div>`
})
export class LandingComponent implements AfterViewInit {
  private router = inject(Router);
  @ViewChild('heroVideo') heroVideo?: ElementRef<HTMLVideoElement>;
  traceCode = '';

  ngAfterViewInit() {
    // Attribute `muted` alone does not set the IDL property Angular needs for
    // autoplay approval — set it imperatively and request playback explicitly.
    const v = this.heroVideo?.nativeElement;
    if (!v) return;
    v.muted = true;
    const attempt = v.play();
    if (attempt) attempt.catch(() => { /* autoplay blocked: first frame still shows */ });
  }

  track() {
    const code = this.traceCode.trim();
    if (code) this.router.navigate(['/traceability', code]);
  }
}
