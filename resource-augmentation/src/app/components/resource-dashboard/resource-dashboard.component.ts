import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  ProfileStatusResponse,
  User,
  UserProfileComplete,
} from '../../core/user.model';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LeaveService } from '../../services/leave.service';
import { environment } from '../../../environments/environment';
import { ProjectActivity } from '../../core/project.model';
import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-resource-dashboard',
  imports: [CommonModule],
  templateUrl: './resource-dashboard.component.html',
  styleUrl: './resource-dashboard.component.css',
})
export class ResourceDashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  profileDetail: UserProfileComplete | null = null;
  leaveBalance: number | null = null;
  pendingApprovals: number | null = null;
  notificationsCount: number | null = null;
  myLeaveApplications: any[] = [];
  filteredLeaveApplications: any[] = [];
  selectedFilter: string = 'All';
  isLoadingApplications: boolean = false;
  userSkills: string[] = [];

  private subs: Subscription[] = [];
  isLoading: boolean = true;
  statusLoading: boolean = true;
  errorMessage: string = '';
  completionPercent: number = 0;

  projectId: number = 0;
  loadingActivity: boolean = false;
  activities: ProjectActivity[] = [];
  myProjects: any[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient,
    private leaveService: LeaveService,
    private projectService: ProjectService
  ) {}

  ngOnInit(): void {
    this.loadinitialData();
    if (typeof this.loadinitialData === 'function') {
      this.loadinitialData();
    }
    this.fetchLeaveBalance();
    this.fetchPendingApprovalsCount();
    this.fetchNotificationsCount();
    this.fetchUserSkills();
    this.fetchMyLeaveApplications();
  }
  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }
  fetchUserSkills() {
    this.authService.getCurrentUserProfile().subscribe({
      next: (res: any) => {
        if (res && res.success && res.data) {
          // Collect skills from employments
          const employmentSkills: string[] = [];
          if (res.data.employments && Array.isArray(res.data.employments)) {
            res.data.employments.forEach((emp: any) => {
              if (emp.Skills && Array.isArray(emp.Skills)) {
                employmentSkills.push(...emp.Skills);
              }
            });
          }

          // Remove duplicates and limit to top 6
          this.userSkills = [...new Set(employmentSkills)].slice(0, 6);
        }
      },
      error: (err) => {
        console.warn('Failed to fetch user skills', err);
        this.userSkills = [];
      },
    });
  }
  /* ---------- Leave balance ---------- */
  fetchLeaveBalance() {
    const s = this.leaveService.getLeaveBalance().subscribe({
      next: (res: any) => {
        // Useful debug line while developing:
        console.log('Leave API result:', res);

        // Attempt to find the balance in common shapes:
        // 1) res.data is an array -> take first element
        // 2) firstElem.availableDays OR .balance OR .available
        // 3) res.data.balance or res.balance
        let balCandidate: any = null;

        if (Array.isArray(res?.data) && res.data.length > 0) {
          balCandidate =
            res.data[0].availableDays ??
            res.data[0].balance ??
            res.data[0].available ??
            null;
        } else {
          balCandidate = res?.data?.balance ?? res?.balance ?? null;
        }

        // If it's still an object (rare), try deeper extraction
        if (typeof balCandidate === 'object' && balCandidate !== null) {
          balCandidate = balCandidate.value ?? balCandidate.amount ?? null;
        }

        // Convert to number if possible (handles "25.00" strings)
        const numeric =
          balCandidate !== null && balCandidate !== undefined
            ? Number(String(balCandidate).replace(/,/g, ''))
            : null;

        this.leaveBalance = Number.isFinite(numeric) ? numeric : null;
      },
      error: (err) => {
        console.warn('Leave balance load failed', err);
        this.leaveBalance = null;
      },
    });

    if (s) this.subs.push(s);
  }
  leaveBalanceDisplay(): string {
    return this.leaveBalance === null ? '--' : this.leaveBalance.toFixed(2);
  }
  /* ---------- Pending approvals & notifications (optional small calls) ---------- */
  fetchPendingApprovalsCount() {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const apiUrl = environment.apiUrl;
    // use correct proxied path
    this.http
      .get<any>(`${apiUrl}/leave/pending-approvals/resource`, {
        headers,
      })
      .subscribe({
        next: (res) => {
          this.pendingApprovals = Array.isArray(res?.data)
            ? res.data.length
            : res?.data
            ? 1
            : 0;
        },
        error: (err) => {
          console.error('Failed to fetch pending approvals count ', err);
          this.pendingApprovals = null;
        },
      });
  }
  fetchMyLeaveApplications() {
    this.isLoadingApplications = true;
    this.leaveService.getMyApplications().subscribe({
      next: (res: any) => {
        if (res && res.success && res.data) {
          this.myLeaveApplications = res.data;
          this.filterApplications('ALL');
        } else {
          this.myLeaveApplications = [];
          this.filteredLeaveApplications = [];
        }
        this.isLoadingApplications = false;
      },
      error: (err) => {
        console.error('Failed ti Fetch leave Applications', err);
        this.myLeaveApplications = [];
        this.filteredLeaveApplications = [];
        this.isLoadingApplications = false;
      },
    });
  }
  filterApplications(status: string) {
    this.selectedFilter = status;
    if (status === 'ALL') {
      this.filteredLeaveApplications = [...this.myLeaveApplications];
    } else {
      this.filteredLeaveApplications = this.myLeaveApplications.filter(
        (app) => app.Status?.toUpperCase() === status.toUpperCase()
      );
    }
  }
  getStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return 'status-approved';
      case 'PENDING':
        return 'status-pending';
      case 'REJECTED':
        return 'status-rejected';
      case 'CANCELLED':
        return 'status-cancelled';
      default:
        return 'status-unknown';
    }
  }
  formatDate(dateString: string): string {
    if (!dateString) {
      return 'N/A';
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  calculateDuration(fromDate: string, toDate: string): number {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }
  viewApplicationDetails(applicationId: string) {
    console.log('View details for application ID:', applicationId);
  }
  authHeaders() {
    return new HttpHeaders({
      Authorization: `Bearer ${this.authService.getToken()}`,
    });
  }
  fetchNotificationsCount() {
    this.http.get<any>('/api/notifications/unread/count').subscribe({
      next: (res) => {
        this.notificationsCount = res?.count ?? null;
      },
      error: (err) => {
        this.notificationsCount = null;
      },
    });
  }
  /* ---------- Recent activity ---------- */
  // fetchRecentActivities() {
  //   this.http.get<any>('/api/user/activities/recent?limit=6').subscribe({
  //     next: (res) => {
  //       this.activities = res?.data ?? [];
  //     },
  //     error: (err) => {
  //       console.warn('Failed to fetch recent activities', err);
  //       this.activities = [
  //         {
  //           type: 'system',
  //           message: 'Could not load activity',
  //           createdAt: new Date().toISOString(),
  //         },
  //       ];
  //     },
  //   });
  // }
  private loadinitialData() {
    this.isLoading = true;
    this.currentUser = this.authService.getCurrentUser();

    this.statusLoading = true;
    this.authService.getProfileStatus().subscribe(
      (response: any) => {
        if (response && response.success && response.data) {
          this.computeCompletionFromStatus(
            response.data as ProfileStatusResponse['data']
          );
        }
        this.statusLoading = false;
      },
      (error: any) => {
        this.errorMessage = 'Failed to load profile status.';
        this.statusLoading = false;
      }
    );
    this.authService.getCurrentUserProfile().subscribe(
      (res: any) => {
        if (res && res.success && res.data) {
          this.profileDetail = res.data as UserProfileComplete;
          this.computeCompletionFromProfile(this.profileDetail);
        }
        this.isLoading = false;
      },
      (error: any) => {
        this.errorMessage = 'Failed to load user profile.';
        this.errorMessage = error.message || this.errorMessage;
        this.isLoading = false;
      }
    );
  }
  private computeCompletionFromStatus(
    statusData: ProfileStatusResponse['data']
  ): void {
    if (!statusData || !statusData.profileCompletion) {
      return;
    }
    const { personalDetails, education, employment } =
      statusData.profileCompletion;
    const parts = [personalDetails, education, employment];
    const completed = parts.filter(Boolean).length;
    this.completionPercent = Math.round((completed / parts.length) * 100);
  }
  private computeCompletionFromProfile(profile: UserProfileComplete): void {
    let personal = false;

    const personalFields = [
      'phone',
      'dateOfBirth',
      'gender',
      'address',
      'city',
      'state',
      'country',
      'zipCode',
      'linkedInProfile',
    ];
    for (const f of personalFields) {
      if ((profile as any)[f]) {
        personal = true;
        break;
      }
    }
    const edcationPresent =
      !!(profile as any).degree ||
      !!(profile as any).fieldOfStudy ||
      !!(profile as any).institution;
    const employmentPresent =
      !!(profile as any).jobTitle || !!(profile as any).companyName;

    const parts = [personal, edcationPresent, employmentPresent];
    const completed = parts.filter(Boolean).length;
    const derived = Math.round((completed / parts.length) * 100);

    if (derived > this.completionPercent) {
      this.completionPercent = derived;
    }
  }
  redirectUpdateProfile() {
    this.router.navigate(['/profile/complete']);
  }

  navigateToLeaveApplication() {
    this.router.navigate(['/leave/apply']);
  }
  viewProfile() {
    this.router.navigate(['/profile/view']);
  }
  loadMyProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (response: any) => {
        if (response && response.success && response.data) {
          this.myProjects = response.data;
          console.log('My projects:', this.myProjects);

          // Load activities for the first project
          if (this.myProjects.length > 0) {
            this.projectId = this.myProjects[0].Id;
            this.loadActivity();
          } else {
            this.loadingActivity = false;
            console.log('No projects assigned to this user');
          }
        }
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.loadingActivity = false;
      },
    });
  }

  // Keep your existing loadActivity method as is
  loadActivity(): void {
    this.loadingActivity = true;
    this.projectService.getProjectActivity(this.projectId).subscribe({
      next: (activities) => {
        this.activities = activities;
        console.log('Loaded activities:', activities);
        this.loadingActivity = false;
      },
      error: (error) => {
        console.error('Error loading activity:', error);
        this.loadingActivity = false;
      },
    });
  }
}
