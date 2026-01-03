import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../core/user.model';
import { LeaveCalendarComponent } from '../leave-calendar/leave-calendar.component';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  
  currentUser: User | null = null;
  totalUsers: number = 0;

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadUserStats();
  }

  private loadUserStats(): void {
    this.authService.getAllUsers().subscribe({
      next: (response) => {
        if (response.success) {
          this.totalUsers = response.data?.length || 0;
        }
      },
      error: (error) => {
        console.error('Error loading user stats:', error);
      }
    });
  }

  // Navigation methods
  navigateToUserManagement(): void {
    this.router.navigate(['/admin/users']);
  }
  navigateToProjectManagement(): void {
    this.router.navigate(['/admin/projects']);
  }
  createNewUser(): void {
    this.router.navigate(['/admin/users/create']);
  }

  viewAllUsers(): void {
    this.router.navigate(['/admin/users']);
  }

  systemSettings(): void {
    // Will implement when settings page is created
    console.log('Navigate to system settings');
  }

  viewReports(): void {
    // Will implement when reports page is created
    console.log('Navigate to reports');
  }
  viewCalendar(): void {
    // Will implement when calendar page is created
   this.router.navigate(['/leave/calendar']);
  }
}
