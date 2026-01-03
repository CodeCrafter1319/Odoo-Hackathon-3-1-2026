import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { LeaveService } from '../../services/leave.service';
import { User } from '../../core/user.model';

@Component({
  selector: 'app-leave-management',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './leave-management.component.html',
  styleUrl: './leave-management.component.css',
})
export class LeaveManagementComponent implements OnInit {
  private authService = inject(AuthService);
  private leaveService = inject(LeaveService);
  private router = inject(Router);

  currentUser: User | null = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  allLeaveApplications: any[] = [];
  filteredApplications: any[] = [];
  
  // Filter options
  statusFilter = 'ALL';
  searchTerm = '';
  dateFilter = '';

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadAllLeaveApplications();
  }

  private loadAllLeaveApplications(): void {
    this.isLoading = true;
    this.clearMessages();
    
    this.leaveService.getAllLeaveApplications().subscribe({
      next: (response) => {
        if (response.success) {
          this.allLeaveApplications = response.data;
          this.filteredApplications = [...this.allLeaveApplications];
          console.log('Loaded all leave applications:', this.allLeaveApplications.length);
        } else {
          this.errorMessage = response.message || 'Failed to load leave applications';
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load leave applications';
        this.isLoading = false;
        console.error('Failed to load all leave applications:', error);
      },
    });
  }

  // Filter methods
  applyFilters(): void {
    this.filteredApplications = this.allLeaveApplications.filter(app => {
      const matchesStatus = this.statusFilter === 'ALL' || app.Status === this.statusFilter;
      const matchesSearch = !this.searchTerm || 
        app.FirstName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        app.LastName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        app.LeaveTypeName.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      let matchesDate = true;
      if (this.dateFilter) {
        const filterDate = new Date(this.dateFilter);
        const fromDate = new Date(app.FromDate);
        const toDate = new Date(app.ToDate);
        matchesDate = filterDate >= fromDate && filterDate <= toDate;
      }

      return matchesStatus && matchesSearch && matchesDate;
    });
  }

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onDateFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.statusFilter = 'ALL';
    this.searchTerm = '';
    this.dateFilter = '';
    this.filteredApplications = [...this.allLeaveApplications];
  }

  // Action methods
  viewApplicationDetails(application: any): void {
    // You can navigate to a detailed view or show a modal
    console.log('Viewing details for application:', application.Id);
  }

  // approveApplication(applicationId: number): void {
  //   this.processLeaveAction(applicationId, 'APPROVED', 'Approved by manager');
  // }

  // rejectApplication(applicationId: number): void {
  //   const reason = prompt('Please enter rejection reason:');
  //   if (reason) {
  //     this.processLeaveAction(applicationId, 'REJECTED', reason);
  //   }
  // }

  private processLeaveAction(applicationId: number, action: string, comments?: string): void {
    this.isLoading = true;
    this.clearMessages();
    
    this.leaveService.processLeaveAction(applicationId, action, comments).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = `Leave ${action.toLowerCase()} successfully`;
          // Update the application status in the list
          const appIndex = this.allLeaveApplications.findIndex(app => app.Id === applicationId);
          if (appIndex > -1) {
            this.allLeaveApplications[appIndex].Status = action;
            this.allLeaveApplications[appIndex].ApprovalComments = comments;
          }
          this.applyFilters(); // Refresh filtered list
        } else {
          this.errorMessage = response.message || `Failed to ${action.toLowerCase()} leave`;
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || `Failed to ${action.toLowerCase()} leave`;
        this.isLoading = false;
      },
    });
  }

  goBackToDashboard(): void {
    this.router.navigate(['/manager/dashboard']);
  }

  refreshData(): void {
    this.loadAllLeaveApplications();
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  // Utility methods
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'status-pending';
      case 'APPROVED':
        return 'status-approved';
      case 'REJECTED':
        return 'status-rejected';
      default:
        return 'status-default';
    }
  }

  calculateLeaveDuration(fromDate: string, toDate: string): number {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const timeDiff = end.getTime() - start.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  }
}
