import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  Router,
  RouterModule,
  RouterOutlet,
  NavigationEnd,
} from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User, Role } from '../../core/user.model';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

@Component({
  selector: 'app-main-layout',
  imports: [CommonModule, RouterModule, RouterOutlet],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser$: Observable<User | null> = this.authService.currentUser$;
  currentUser: User | null = null;
  Role = Role; // Make enum available in template

  sidebarOpen = false;
  profileExpanded = false; // New property for profile menu
  currentRoute = '';

  ngOnInit(): void {
    // Subscribe to current user
    this.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });

    // Track route changes for dynamic page titles
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        map((event) => (event as NavigationEnd).url)
      )
      .subscribe((url) => {
        this.currentRoute = url;
        // Auto-expand profile menu if on profile routes
        if (url.includes('/profile')) {
          this.profileExpanded = true;
        }
      });
  }

  /**
   * Toggle sidebar visibility (for mobile)
   */
  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  /**
   * Toggle profile submenu expansion
   */
  toggleProfileMenu(): void {
    this.profileExpanded = !this.profileExpanded;
  }

  /**
   * Check if current user has specific roles
   */
  hasRole(roles: Role[]): boolean {
    if (!this.currentUser) {
      return false;
    }
    return roles.includes(this.currentUser.role as Role);
  }

  /**
   * Get dynamic page title based on current route
   */
  getPageTitle(): string {
    const route = this.currentRoute;
    if (route.includes('/admin/dashboard')) {
      return 'Admin Dashboard';
    } else if (route.includes('/admin/users')) {
      return 'User Management';
    } else if (route.includes('/admin/leave-calendar')) {
      return 'Leave Calendar';
    } else if (route.includes('/company/dashboard')) {
      return 'Company Dashboard';
    } else if (route.includes('/resource/dashboard')) {
      return 'Resource Dashboard';
    } else if (route.includes('/resource/dashboard')) {
      return 'Manager Dashboard';
    } else if (route.includes('/profile/complete')) {
      return 'Complete Profile';
    } else if (route.includes('/profile')) {
      return 'Profile Management';
    } else {
      return 'Dashboard';
    }
  }

  /**
   * Logout user and redirect to login
   */
  logout(): void {
    this.authService.logout();
    this.sidebarOpen = false;
  }

  /**
   * Close sidebar when clicking on nav items (for mobile)
   */
  onNavItemClick(): void {
    if (window.innerWidth <= 768) {
      this.sidebarOpen = false;
    }
  }

  /**
   * Handle clicking outside sidebar (for mobile)
   */
  onOverlayClick(): void {
    this.sidebarOpen = false;
  }
}
