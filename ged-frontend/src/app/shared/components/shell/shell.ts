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
    <div class="flex min-h-screen bg-gray-50">
      <app-sidebar [userEmail]="userEmail"></app-sidebar>
      <main class="flex-1 overflow-auto">
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
