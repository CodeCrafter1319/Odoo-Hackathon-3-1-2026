import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import {
  User,
  Role,
  ApiResponse,
  CreateUserRequest,
} from '../../core/user.model';

@Component({
  selector: 'app-admin-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-user-management.component.html',
  styleUrl: './admin-user-management.component.css',
})
export class AdminUserManagementComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  users: User[] = [];
  isLoading = false;
  showCreateForm = false;
  successMessage = '';
  errorMessage = '';

  // Modal states
  showViewModal = false;
  showDeleteModal = false;
  isLoadingUserDetails = false;
  selectedUserDetails: any = null;
  deleteUserId: number | null = null;
  deleteUserName: string = '';

  // Create user form
  createUserForm: CreateUserRequest = {
    firstName: '',
    lastName: '',
    email: '',
    role: Role.RESOURCE,
  };

  availableManagers: any[] = [];
  userRoles = Object.values(Role).filter((type) => type !== Role.ADMIN);

  ngOnInit(): void {
    this.loadUsers();
    this.loadManagers();
  }

  loadManagers(): void {
    this.authService.getAvailableManagers().subscribe({
      next: (response) => {
        if (response.success) {
          this.availableManagers = response.data;
        }
      },
      error: (error) => {
        console.error('Failed to load managers:', error);
      },
    });
  }

  loadUsers(): void {
    this.isLoading = true;
    this.authService.getAllUsers().subscribe({
      next: (response: ApiResponse<User[]>) => {
        if (response.success) {
          this.users = response.data || [];
        } else {
          this.errorMessage = response.message || 'Failed to load users';
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load users';
        this.isLoading = false;
      },
    });
  }

  // View user modal methods
  viewUser(user: any): void {
    this.isLoadingUserDetails = true;
    this.showViewModal = true;
    this.selectedUserDetails = null;

    this.authService.getUserDetails(user.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.selectedUserDetails = {
            ...response.data,
            educations: response.data.educations || [],
            employments: response.data.employments || [],
          };
        }
        this.isLoadingUserDetails = false;
      },
      error: (error) => {
        console.error('Failed to load user details:', error);
        this.isLoadingUserDetails = false;
      },
    });
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedUserDetails = null;
  }

  // Delete confirmation modal methods
  confirmDelete(user: any): void {
    this.deleteUserId = user.id;
    this.deleteUserName = `${user.firstName} ${user.lastName}`;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.deleteUserId = null;
    this.deleteUserName = '';
  }

  deleteUser(): void {
    if (!this.deleteUserId) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.deleteUser(this.deleteUserId).subscribe({
      next: (response: ApiResponse<any>) => {
        if (response.success) {
          this.successMessage = `User "${this.deleteUserName}" deleted successfully`;
          this.users = this.users.filter(
            (user) => user.id !== this.deleteUserId
          );
          this.cancelDelete();
        } else {
          this.errorMessage = response.message || 'Failed to delete user';
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to delete user. Please try again.';
        this.isLoading = false;
        console.error('Delete user error:', error);
      },
    });
  }

  // Create user methods
  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (!this.showCreateForm) {
      this.resetCreateForm();
    }
  }

  onCreateUser(): void {
    if (!this.isCreateFormValid()) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.createUser(this.createUserForm).subscribe({
      next: (response: ApiResponse<any>) => {
        if (response.success) {
          this.successMessage = `User created successfully! ${response.message}`;
          this.resetCreateForm();
          this.showCreateForm = false;
          this.loadUsers();
        } else {
          this.errorMessage = response.message || 'Failed to create user';
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to create user';
        this.isLoading = false;
      },
    });
  }

  private resetCreateForm(): void {
    this.createUserForm = {
      firstName: '',
      lastName: '',
      email: '',
      role: Role.RESOURCE,
    };
  }

  isCreateFormValid(): boolean {
    return !!(
      this.createUserForm.firstName.trim() &&
      this.createUserForm.lastName.trim() &&
      this.createUserForm.email.trim() &&
      this.isValidEmail(this.createUserForm.email) &&
      this.createUserForm.role
    );
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Utility methods
  getUserInitials(user: any): string {
    if (!user) return '??';
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`;
  }

  hasPersonalDetails(): boolean {
    return !!(
      this.selectedUserDetails?.phone ||
      this.selectedUserDetails?.dateOfBirth ||
      this.selectedUserDetails?.gender ||
      this.selectedUserDetails?.address
    );
  }

  hasEducationDetails(): boolean {
    return !!(
      this.selectedUserDetails?.educations &&
      this.selectedUserDetails.educations.length > 0
    );
  }

  hasEmploymentDetails(): boolean {
    return !!(
      this.selectedUserDetails?.employments &&
      this.selectedUserDetails.employments.length > 0
    );
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getUserRoleColor(role: Role): string {
    switch (role) {
      case Role.ADMIN:
        return 'bg-red-100 text-red-800';
      case Role.COMPANY:
        return 'bg-blue-100 text-blue-800';
      case Role.RESOURCE:
        return 'bg-green-100 text-green-800';
      case Role.MANAGER:
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusColor(isActive: boolean, isEmailVerified: boolean): string {
    if (isActive && isEmailVerified) {
      return 'bg-green-100 text-green-800';
    } else if (!isEmailVerified) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-red-100 text-red-800';
    }
  }

  getStatusText(isActive: boolean, isEmailVerified: boolean): string {
    if (isActive && isEmailVerified) {
      return 'Active';
    } else if (!isEmailVerified) {
      return 'Pending Verification';
    } else {
      return 'Inactive';
    }
  }

  canDeleteUser(user: any): boolean {
    const currentUser = this.authService.getCurrentUser();
    return user.id !== currentUser?.id;
  }

  backToDashboard(): void {
    this.router.navigate(['/admin/dashboard']);
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeViewModal();
      this.cancelDelete();
    }
  }
}
