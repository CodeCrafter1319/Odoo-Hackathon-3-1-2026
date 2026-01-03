import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LeaveService } from '../../services/leave.service';
import { User } from '../../core/user.model';
import { ManagerService } from '../../services/manager.service';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './manager-dashboard.component.html',
  styleUrl: './manager-dashboard.component.css',
})
export class ManagerDashboardComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private leaveService = inject(LeaveService);
  private router = inject(Router);
  private managerService = inject(ManagerService);
  currentUser: User | null = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // Dashboard data (leave-related only)
  teamStats = {
    totalMembers: 0,
    pendingApprovals: 0,
  };

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadDashboardData();

    // Subscribe to refresh notifications
    this.leaveService.refreshNeeded$.subscribe(() => {
      this.loadDashboardData();
    });
  }

  ngOnDestroy(): void {
    // Clean up subscriptions if needed
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    this.clearMessages();

    this.loadTeamStats().finally(() => {
      this.isLoading = false;
    });
  }

  private async loadTeamStats(): Promise<void> {
    return new Promise((resolve) => {
      this.managerService.getManagerDashboardStats().subscribe({
        next: (response) => {
          if (response.success) {
            this.teamStats = { 
              totalMembers: response.data.totalMembers || 0,
              pendingApprovals: response.data.pendingApprovals || 0
            };
            console.log('Loaded team stats:', this.teamStats);
          } else {
            console.error('Failed to load team stats:', response.message);
          }
          resolve();
        },
        error: (error) => {
          console.error('Failed to load team stats:', error);
          resolve();
        },
      });
    });
  }

  // Leave-related navigation methods
  viewLeaveApprovals(): void {
    this.router.navigate(['/leave/approvals']);
  }

  // Utility methods
  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
  viewLeaveCalendar(): void {
    this.router.navigate(['/leave/calendar']);
  }
  refreshData(): void {
    this.loadDashboardData();
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }
}
