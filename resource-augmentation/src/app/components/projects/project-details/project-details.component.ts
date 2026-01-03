import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ProjectService } from '../../../services/project.service';
import { StorageService } from '../../../services/storage.service';
import { Project, ProjectActivity } from '../../../core/project.model';
import { ProjectChatComponent } from '../project-chat/project-chat.component';
import { Subscription } from 'rxjs';
import { WebsocketService } from '../../../services/websocket.service';

@Component({
  selector: 'app-project-details',
  standalone: true,
  imports: [CommonModule, ProjectChatComponent, ReactiveFormsModule],
  templateUrl: './project-details.component.html',
  styleUrls: ['./project-details.component.css'],
})
export class ProjectDetailsComponent implements OnInit, OnDestroy {
  project: Project | null = null;
  activities: ProjectActivity[] = [];
  loading = true;
  loadingActivity = false;
  error: string | null = null;
  successMessage: string | null = null;
  userRole: string | null = null;
  projectId: number = 0;
  projectMembers: any[] = [];
  showChat = false;
  unreadCount = 0;

  // Edit mode state
  isEditMode = false;
  projectForm!: FormGroup;
  isSubmitting = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private storageService: StorageService,
    private location: Location,
    private wsService: WebsocketService,
    private fb: FormBuilder
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.userRole = this.storageService.getUserRole();

    if (!this.userRole) {
      const currentUser = this.storageService.getCurrentUser();

      this.userRole =
        currentUser?.role ||
        currentUser?.Role ||
        currentUser?.userRole ||
        currentUser?.user_role ||
        null;
    }

    this.route.params.subscribe((params) => {
      this.projectId = +params['id'];
      if (this.projectId) {
        this.loadProject();
        this.loadActivity();
        this.setupUnreadCount();
      }
    });
  }

  /**
   * Initialize the form
   */
  private initializeForm(): void {
    this.projectForm = this.fb.group({
      ProjectName: ['', [Validators.required, Validators.minLength(3)]],
      ProjectCode: ['', [Validators.required]],
      ProjectType: ['', [Validators.required]],
      Status: ['', [Validators.required]],
      Priority: ['', [Validators.required]],
      Description: [''],
      ClientName: [''],
      ProjectLocation: [''],
      StartDate: [''],
      EndDate: [''],
      EstimatedBudget: ['', [Validators.min(0)]],
      Currency: ['USD'],
      ProjectStack: [''],
      Domain: [''],
      DocumentationUrl: [''],
      RepositoryUrl: [''],
    });
  }

  loadProject(): void {
    this.loading = true;
    this.projectService.getProjectById(this.projectId).subscribe({
      next: (project) => {
        this.project = project;
        this.projectMembers = this.extractTeamMembers(project);
        this.loading = false;
        // Populate form if in edit mode
        if (this.isEditMode) {
          this.populateForm();
        }
      },
      error: (error) => {
        this.error = 'Failed to load project details';
        this.loading = false;
        console.error('Error loading project:', error);
      },
    });
  }

  /**
   * Populate form with existing project data
   */
  private populateForm(): void {
    if (!this.project) return;

    this.projectForm.patchValue({
      ProjectName: this.project.ProjectName || '',
      ProjectCode: this.project.ProjectCode || '',
      ProjectType: this.project.ProjectType || '',
      Status: this.project.Status || 'PLANNING',
      Priority: this.project.Priority || 'MEDIUM',
      Description: this.project.Description || '',
      ClientName: this.project.ClientName || '',
      ProjectLocation: this.project.ProjectLocation || '',
      StartDate: this.project.StartDate
        ? this.formatDateForInput(this.project.StartDate)
        : '',
      EndDate: this.project.EndDate
        ? this.formatDateForInput(this.project.EndDate)
        : '',
      EstimatedBudget: this.project.EstimatedBudget || '',
      Currency: this.project.Currency || 'USD',
      ProjectStack: this.project.ProjectStack || '',
      Domain: this.project.Domain || '',
      DocumentationUrl: this.project.DocumentationUrl || '',
      RepositoryUrl: this.project.RepositoryUrl || '',
    });
  }

  /**
   * Format date for input field (YYYY-MM-DD)
   */
  private formatDateForInput(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Toggle edit mode
   */
  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
    this.error = null;
    this.successMessage = null;

    if (this.isEditMode) {
      this.populateForm();
    }
  }

  /**
   * Cancel editing
   */
  cancelEdit(): void {
    this.isEditMode = false;
    this.error = null;
    this.successMessage = null;
    this.projectForm.reset();
  }

  /**
   * Update project
   */
  updateProject(): void {
    if (this.projectForm.invalid) {
      this.error = 'Please fill in all required fields correctly';
      return;
    }

    this.isSubmitting = true;
    this.error = null;
    this.successMessage = null;

    const formData = this.projectForm.value;

    // Clean up the data
    const updateData: any = {
      ...formData,
      EstimatedBudget: formData.EstimatedBudget
        ? parseFloat(formData.EstimatedBudget)
        : null,
    };

    console.log('Updating project with data:', updateData);

    this.projectService.updateProject(this.projectId, updateData).subscribe({
      next: (updatedProject) => {
        console.log('✅ Project updated successfully:', updatedProject);
        this.successMessage = 'Project updated successfully!';
        this.isSubmitting = false;
        this.isEditMode = false;

        // Reload project to show updated data
        this.loadProject();

        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = null;
        }, 3000);
      },
      error: (error) => {
        console.error('❌ Error updating project:', error);
        this.error = error.error?.message || 'Failed to update project';
        this.isSubmitting = false;
      },
    });
  }

  private extractTeamMembers(project: Project): any[] {
    const members: any[] = [];
    if (project.ManagerId && project.ManagerName) {
      members.push({
        id: project.ManagerId,
        name: project.ManagerName,
        role: 'Manager',
        email: project.ManagerEmail || '',
      });
    }

    if (project.resources && Array.isArray(project.resources)) {
      project.resources.forEach((resource) => {
        members.push({
          id: resource.UserId,
          name: resource.ResourceName,
          role: resource.ResourceRole || 'Resource',
          email: resource.ResourceEmail,
        });
      });
    }

    return members;
  }

  loadActivity(): void {
    this.loadingActivity = true;
    this.projectService.getProjectActivity(this.projectId).subscribe({
      next: (activities) => {
        this.activities = activities;
        this.loadingActivity = false;
      },
      error: (error) => {
        console.error('Error loading activity:', error);
        this.loadingActivity = false;
      },
    });
  }

  private setupUnreadCount(): void {
    this.subscriptions.push(
      this.wsService
        .getUnreadCountForProject(this.projectId)
        .subscribe((count) => {
          this.unreadCount = count;
        })
    );

    this.wsService.fetchUnreadCount(this.projectId).subscribe({
      next: (response) => {
        console.log('✅ Initial unread count fetched:', response);
      },
      error: (error) => {
        console.error('❌ Failed to fetch unread count:', error);
      },
    });
  }

  toggleChat(): void {
    this.showChat = !this.showChat;
    if (this.showChat) {
      this.markChatAsRead();
    }
  }

  private markChatAsRead(): void {
    this.wsService.markChatAsRead(this.projectId).subscribe({
      next: (response) => {
        console.log('✅ Chat marked as read:', response);
        this.wsService.resetUnreadCount(this.projectId);
      },
      error: (error) => {
        console.error('❌ Failed to mark chat as read:', error);
      },
    });
  }

  closeChat(): void {
    this.showChat = false;
  }

  goBack(): void {
    this.location.back();
  }

  manageResources(): void {
    this.router.navigate([
      `/${this.userRole?.toLowerCase()}/projects`,
      this.projectId,
      'resources',
    ]);
  }

  editProject(): void {
    this.toggleEditMode();
  }

  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      ACTIVE: 'status-active',
      PLANNING: 'status-planning',
      ON_HOLD: 'status-on-hold',
      COMPLETED: 'status-completed',
      CANCELLED: 'status-cancelled',
    };
    return statusClasses[status] || '';
  }

  getPriorityClass(priority: string): string {
    const priorityClasses: { [key: string]: string } = {
      LOW: 'priority-low',
      MEDIUM: 'priority-medium',
      HIGH: 'priority-high',
      CRITICAL: 'priority-critical',
    };
    return priorityClasses[priority] || '';
  }

  formatDate(date: any | null): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  formatDateTime(date: string): string {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  canManageResources(): boolean {
    return this.userRole === 'MANAGER' || this.userRole === 'ADMIN';
  }

  canEditProject(): boolean {
    return this.userRole === 'ADMIN' || this.userRole === 'MANAGER';
  }

  dismissError(): void {
    this.error = null;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
