import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { LeaveService } from '../../services/leave.service';
import { User } from '../../core/user.model';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-leave-approvals',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './leave-approvals.component.html',
  styleUrl: './leave-approvals.component.css',
})
export class LeaveApprovalsComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private leaveService = inject(LeaveService);
  private router = inject(Router);

  currentUser: User | null = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  private autoRefreshSubscription?: Subscription;

  pendingLeaveApprovals: any[] = [];

  // Modal states
  showApprovalModal = false;
  showRejectModal = false;
  showDetailsModal = false;
  selectedApplication: any = null;
  rejectionReason = '';
  approvalComments = '';
  emailNotificationStatus: {
    [applicationId: number]: {
      emailSent: boolean;
      message: string;
    };
  } = {};

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadPendingApprovals();

    // Subscribe to refresh notifications
    this.leaveService.refreshNeeded$.subscribe(() => {
      this.loadPendingApprovals();
    });

    // Auto-refresh every 30 seconds
    this.autoRefreshSubscription = interval(30000).subscribe(() => {
      this.loadPendingApprovals();
    });
  }

  ngOnDestroy(): void {
    this.autoRefreshSubscription?.unsubscribe();
  }

  private loadPendingApprovals(): void {
    this.isLoading = true;
    this.clearMessages();

    this.leaveService.getPendingApprovals().subscribe({
      next: (response) => {
        if (response.success) {
          this.pendingLeaveApprovals = response.data;
          console.log(
            'Loaded pending approvals:',
            this.pendingLeaveApprovals.length
          );
        } else {
          this.errorMessage =
            response.message || 'Failed to load pending approvals';
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load pending approvals';
        this.isLoading = false;
        console.error('Failed to load pending approvals:', error);
      },
    });
  }

  // Leave approval methods
  approveLeave(applicationId: number): void {
    this.selectedApplication = this.pendingLeaveApprovals.find(
      (app) => app.Id === applicationId
    );
    this.approvalComments = '';
    this.showApprovalModal = true;
  }

  rejectLeave(applicationId: number): void {
    this.selectedApplication = this.pendingLeaveApprovals.find(
      (app) => app.Id === applicationId
    );
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  viewLeaveDetails(application: any): void {
    this.selectedApplication = application;
    this.showDetailsModal = true;
  }

  // Approval modal methods
  closeApprovalModal(): void {
    this.showApprovalModal = false;
    this.selectedApplication = null;
    this.approvalComments = '';
  }

  confirmApproval(): void {
    if (this.selectedApplication) {
      this.processLeaveAction(
        this.selectedApplication.Id,
        'APPROVED',
        this.approvalComments.trim() || 'Leave approved by manager'
      );
      this.closeApprovalModal();
    }
  }

  // Rejection modal methods
  closeRejectModal(): void {
    this.showRejectModal = false;
    this.selectedApplication = null;
    this.rejectionReason = '';
  }

  confirmRejection(): void {
    if (this.selectedApplication && this.rejectionReason.trim()) {
      this.processLeaveAction(
        this.selectedApplication.Id,
        'REJECTED',
        this.rejectionReason.trim()
      );
      this.closeRejectModal();
    }
  }

  // Details modal methods
  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedApplication = null;
  }

  private processLeaveAction(
    applicationId: number,
    action: string,
    comments?: string
  ): void {
    this.isLoading = true;
    this.clearMessages();

    this.leaveService
      .processLeaveAction(applicationId, action, comments)
      .subscribe({
        next: (response) => {
          if (response.success) {
            let message = `Leave ${action.toLowerCase()} successfully`;

            // NEW: Handle email notification status
            if (response.data?.emailSent !== undefined) {
              this.emailNotificationStatus[applicationId] = {
                emailSent: response.data.emailSent,
                message: response.data.emailSent
                  ? '📧 Employee has been notified via email'
                  : '⚠️ Email notification failed',
              };

              if (response.data.emailSent) {
                message += '. Employee has been notified via email.';
              } else {
                message += '. Note: Email notification failed.';
              }
            }

            this.successMessage = message;

            // Remove the processed application from the list
            this.pendingLeaveApprovals = this.pendingLeaveApprovals.filter(
              (app) => app.Id !== applicationId
            );
          } else {
            this.errorMessage =
              response.message || `Failed to ${action.toLowerCase()} leave`;
          }

          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage =
            error.error?.message || `Failed to ${action.toLowerCase()} leave`;
          this.isLoading = false;
        },
      });
  }

  goBackToDashboard(): void {
    this.router.navigate(['/manager/dashboard']);
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  refreshData(): void {
    this.loadPendingApprovals();
  }

  // Utility methods
  calculateLeaveDuration(fromDate: string, toDate: string): number {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const timeDiff = end.getTime() - start.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
