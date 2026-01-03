import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaveService } from '../../services/leave.service';
import {
  LeaveApplication,
  LeaveBalance,
  LeaveDay,
  LeaveType,
} from '../../core/leave.model';

@Component({
  selector: 'app-leave-application',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leave-application.component.html',
  styleUrl: './leave-application.component.css',
})
export class LeaveApplicationComponent implements OnInit {
  leaveTypes: LeaveType[] = [];
  leaveBalances: LeaveBalance[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  allowUnpaidLeaves = false;
  paymentBreakdown: {
    requestedDays: number;
    paidDays: number;
    unpaidDays: number;
    availableDays: number;
  } | null = null;
  leaveForm: LeaveApplication = {
    leaveTypeId: 0,
    fromDate: '',
    toDate: '',
    reason: '',
    leaveDays: [],
  };
  emailNotificationStatus: {
    managerNotified: boolean;
    notificationMessage: string;
  } | null = null;
  leaveDays: LeaveDay[] = [];
  showDayDetails = false;

  constructor(private leaveService: LeaveService) {}

  ngOnInit(): void {
    this.loadLeaveTypes();
    this.loadLeaveBalances();
  }

  loadLeaveTypes(): void {
    this.leaveService.getLeaveTypes().subscribe({
      next: (response) => {
        console.log('Leave types response:', response); // Debug log
        if (response.success) {
          this.leaveTypes = response.data;
        }
      },
      error: (error) => {
        console.error('Full error object:', error); // Debug log
        console.error('Response text:', error.error); // See actual HTML response
        this.errorMessage = 'Failed to load leave types';
      },
    });
  }

  loadLeaveBalances(): void {
    this.leaveService.getLeaveBalance().subscribe({
      next: (response) => {
        if (response.success) {
          this.leaveBalances = response.data;
        } else {
          this.errorMessage =
            response.message || 'Failed to load leave balances';
        }
      },
      error: (error) => {
        this.errorMessage = 'Failed to load leave balances';
      },
    });
  }

  onDateRangeChange(): void {
    if (this.leaveForm.fromDate && this.leaveForm.toDate) {
      this.generateLeaveDays();
      this.showDayDetails = true;
      this.calculatePaymentBreakdown(); // Add this line
    } else {
      this.showDayDetails = false;
      this.leaveDays = [];
      this.paymentBreakdown = null; // Reset breakdown
    }
  }
  onLeaveTypeChange(): void {
    this.calculatePaymentBreakdown();
  }
  calculatePaymentBreakdown(): void {
    if (
      !this.leaveForm.leaveTypeId ||
      !this.leaveForm.fromDate ||
      !this.leaveForm.toDate ||
      !this.leaveDays.length
    ) {
      this.paymentBreakdown = null;
      return;
    }

    const requestedDays = this.calculateRequestedDays();
    const availableDays = this.getAvailableDays(this.leaveForm.leaveTypeId);

    // Calculate payment breakdown
    if (requestedDays <= availableDays) {
      // All days are paid
      this.paymentBreakdown = {
        requestedDays,
        paidDays: requestedDays,
        unpaidDays: 0,
        availableDays,
      };
    } else {
      // Some days will be unpaid
      this.paymentBreakdown = {
        requestedDays,
        paidDays: availableDays,
        unpaidDays: requestedDays - availableDays,
        availableDays,
      };
    }
  }
  generateLeaveDays(): void {
    const startDate = new Date(this.leaveForm.fromDate);
    const endDate = new Date(this.leaveForm.toDate);

    this.leaveDays = [];

    for (
      let date = new Date(startDate);
      date <= endDate;
      date.setDate(date.getDate() + 1)
    ) {
      this.leaveDays.push({
        date: date.toISOString().split('T')[0],
        isHalfDay: false,
        halfDayType: undefined,
      });
    }

    this.leaveForm.leaveDays = [...this.leaveDays];
  }

  onDayTypeChange(index: number): void {
    if (!this.leaveDays[index].isHalfDay) {
      this.leaveDays[index].halfDayType = undefined;
    }
    this.leaveForm.leaveDays = [...this.leaveDays];
  }

  getAvailableDays(leaveTypeId: number): number {
    const balance = this.leaveBalances.find(
      (b) => Number(b.leaveTypeId) === Number(leaveTypeId)
    );

    console.log('Finding balance for leaveTypeId:', leaveTypeId);
    console.log('Available balances:', this.leaveBalances);
    console.log('Found balance:', balance);

    return balance ? Number(balance.availableDays) : 0;
  }

  calculateRequestedDays(): number {
    if (!this.leaveDays.length) return 0;

    return this.leaveDays.reduce((total, day) => {
      return total + (day.isHalfDay ? 0.5 : 1);
    }, 0);
  }

  validateLeaveRequest(): boolean {
    const requestedDays = this.calculateRequestedDays();
    const availableDays = this.getAvailableDays(this.leaveForm.leaveTypeId);

    if (requestedDays > availableDays) {
      if (!this.allowUnpaidLeaves) {
        this.errorMessage = `Insufficient leave balance. You requested ${requestedDays} days but only have ${availableDays} days available. Enable "Allow Unpaid Leave" to proceed.`;
        return false;
      } else {
        // Allow unpaid leaves
        const unpaidDays = requestedDays - availableDays;
        this.successMessage = `Payment Breakdown: ${availableDays} days will be PAID, ${unpaidDays} days will be UNPAID.`;
        this.errorMessage = '';
      }
    } else {
      this.errorMessage = '';
      this.successMessage = '';
    }

    return true;
  }

  onSubmitLeave(): void {
    // Debug logging
    console.log('Submit button clicked');
    console.log('Form valid:', this.isFormValid());
    console.log('Leave form data:', this.leaveForm);
    console.log('Leave days:', this.leaveDays);

    if (!this.isFormValid()) {
      this.errorMessage =
        'Please fill all required fields and configure leave days';
      return;
    }

    if (!this.validateLeaveRequest()) {
      return;
    }

    const leavePayload: LeaveApplication = {
      leaveTypeId: this.leaveForm.leaveTypeId,
      fromDate: this.leaveForm.fromDate,
      toDate: this.leaveForm.toDate,
      reason: this.leaveForm.reason,
      leaveDays: this.leaveDays.map((day) => ({
        date: day.date,
        isHalfDay: day.isHalfDay,
        halfDayType: day.isHalfDay ? day.halfDayType : undefined,
      })),
      allowUnpaidLeaves: this.allowUnpaidLeaves,
    };

    console.log('Submitting leave payload:', leavePayload);

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.leaveService.applyLeave(leavePayload).subscribe({
      next: (response) => {
        console.log('Server response:', response);
        if (response.success) {
          this.successMessage =
            response.data?.message ||
            'Leave application submitted successfully';
          if (response.data?.paymentDetails?.isPartiallyUnpaid) {
            this.successMessage += ` Note: ${response.data.paymentDetails.unpaidDays} days will be unpaid.`;
          }
          if(response.data?.emailSent !== undefined){
            this.emailNotificationStatus = {
              managerNotified: response.data.emailSent,
              notificationMessage: response.data.emailSent
                ? 'Your manager has been notified via email.'
                : 'Failed to send email notification to your manager.',
            }
            if(response.data.emailSent){
              this.successMessage+=" Your manager has been notified via email.";
            }
          }
          this.resetForm();
          this.loadLeaveBalances();
        } else {
          this.errorMessage = response.message || 'Failed to apply for leave';
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Leave application error:', error);
        this.errorMessage = error.error?.message || 'Failed to apply for leave';
        this.isLoading = false;
      },
    });
  }

  isFormValid() {
    return (
      this.leaveForm.leaveTypeId > 0 &&
      this.leaveForm.fromDate &&
      this.leaveForm.toDate &&
      this.leaveForm.reason.trim().length > 0 &&
      this.leaveDays.length > 0
    );
  }

  resetForm(): void {
    this.leaveForm = {
      leaveTypeId: 0,
      fromDate: '',
      toDate: '',
      reason: '',
      leaveDays: [],
    };
    this.leaveDays = [];
    this.showDayDetails = false;
    this.emailNotificationStatus = null;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  onAllowUnpaidLeavesChange(): void {
    this.validateLeaveRequest();
    this.calculatePaymentBreakdown();
  }
}
