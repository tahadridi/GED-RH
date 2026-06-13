import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, Sidebar],
  template: `
    <div class="flex h-screen bg-gray-50 overflow-hidden">
      <app-sidebar [userEmail]="userEmail" class="h-full flex-none"></app-sidebar>
      <main class="flex-1 overflow-y-auto">
        <router-outlet></router-outlet>
      </main>
    </div>
  `
})
export class Shell implements OnInit {
  userEmail = '';

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
}
