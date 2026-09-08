import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideMenu } from '@lucide/angular';
import { Sidebar } from '../sidebar/sidebar';
import { UiDialogs } from '../ui-dialogs/ui-dialogs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, Sidebar, UiDialogs, LucideMenu],
  template: `
    <div class="flex h-screen bg-gray-50 overflow-hidden">
      <!-- Mobile backdrop -->
      @if (sidebarOpen) {
        <div class="fixed inset-0 z-40 bg-[#0a1128]/45 backdrop-blur-[2px] lg:hidden" (click)="closeSidebar()"></div>
      }

      <!-- Sidebar: drawer on mobile, static on desktop -->
      <div [class.left-0]="sidebarOpen" [class.-left-64]="!sidebarOpen"
           class="fixed inset-y-0 left-0 z-50 flex-none transition-all duration-300 ease-out lg:static lg:z-auto lg:shadow-none shadow-[0_20px_60px_rgba(0,7,45,.35)]">
        <app-sidebar [userEmail]="userEmail" (sidebarClose)="closeSidebar()" class="h-full"></app-sidebar>
      </div>

      <main class="flex-1 min-w-0 overflow-y-auto">
        <!-- Mobile top bar -->
        <header class="lg:hidden sticky top-0 z-30 h-[56px] px-4 bg-white border-b border-[#e7ecf2] flex items-center gap-3">
          <button (click)="openSidebar()" aria-label="Menu" class="w-[38px] h-[38px] rounded-[10px] border border-[#e7ecf2] bg-white text-[#17233c] flex items-center justify-center hover:bg-[#f8fafc] transition-colors shrink-0">
            <svg lucideMenu class="w-5 h-5"></svg>
          </button>
          <img src="/logo.png" alt="Logo" class="h-8 w-auto object-contain">
          <div class="min-w-0 leading-tight">
            <div class="text-[15px] font-bold text-[#15213d]">GED RH</div>
            <div class="text-[10px] text-[#9aa5b7]">Gestion Électronique des Documents</div>
          </div>
        </header>
        <router-outlet></router-outlet>
      </main>
      <app-ui-dialogs></app-ui-dialogs>
    </div>
  `
})
export class Shell implements OnInit {
  userEmail = '';
  sidebarOpen = false;

  constructor(private auth: AuthService) {}

  ngOnInit() {
    const u = this.auth.user();
    this.userEmail = u?.email ?? '';
    // Subscribe to changes
    setInterval(() => {
      const user = this.auth.user();
      this.userEmail = user?.email ?? '';
    }, 2000);
  }

  openSidebar() {
    this.sidebarOpen = true;
  }

  closeSidebar() {
    this.sidebarOpen = false;
  }
}
