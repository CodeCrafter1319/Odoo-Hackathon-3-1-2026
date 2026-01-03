import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { Role } from './core/user.model';
import { AdminProjectsListComponent } from './components/projects/admin-projects-list/admin-projects-list.component';
import { ManagerProjectComponent } from './components/projects/manager-project/manager-project.component';
import { ResourceProjectComponent } from './components/projects/resource-project/resource-project.component';
import { ProjectDetailsComponent } from './components/projects/project-details/project-details.component';
import { ProjectResourcesComponent } from './components/projects/projectResources/project-resources/project-resources.component';
import { AdminProjectsCreateComponent } from './components/projects/admin-projects-create/admin-projects-create.component';

export const routes: Routes = [
  // Default redirect
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full',
  },

  // PUBLIC ROUTES (No authentication required)

  // Authentication routes
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./components/login/login.component').then(
            (m) => m.LoginComponent
          ),
        title: 'Login - Resource Augmentation',
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./components/register/register.component').then(
            (m) => m.RegisterComponent
          ),
        title: 'Register - Resource Augmentation',
      },
    ],
  },

  // Email verification route
  {
    path: 'verify-email/:token',
    loadComponent: () =>
      import(
        './components/email-verification/email-verification.component'
      ).then((m) => m.EmailVerificationComponent),
    title: 'Email Verification - Resource Augmentation',
    data: { prerender: false },
  },

  // PROTECTED ROUTES (Authentication required)
  {
    path: '',
    loadComponent: () =>
      import('./components/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent
      ),
    canActivate: [authGuard],
    children: [
      // ADMIN ROUTES
      {
        path: 'admin',
        canActivate: [roleGuard([Role.ADMIN])],
        children: [
          {
            path: 'projects/create',
            component: AdminProjectsCreateComponent,
          },
          {
            path: 'projects/:id',
            component:ProjectDetailsComponent
          },
          {
            path: 'dashboard',
            loadComponent: () =>
              import(
                './components/admin-dashboard/admin-dashboard.component'
              ).then((m) => m.AdminDashboardComponent),
            title: 'Admin Dashboard - Resource Augmentation',
          },
          {
            path: 'users',
            loadComponent: () =>
              import(
                './components/admin-user-management/admin-user-management.component'
              ).then((m) => m.AdminUserManagementComponent),
            title: 'User Management - Resource Augmentation',
          },
          {
            path: 'users/create',
            loadComponent: () =>
              import(
                './components/admin-user-management/admin-user-management.component'
              ).then((m) => m.AdminUserManagementComponent),
            title: 'Create User - Resource Augmentation',
          },
          {
            path: 'leave-calendar',
            loadComponent: () =>
              import(
                './components/leave-calendar/leave-calendar.component'
              ).then((m) => m.LeaveCalendarComponent),
            title: 'Leave Calendar - Resource Augmentation',
          },
          {
            path: 'projects',
            component: AdminProjectsListComponent,
          },
          {
            path: '',
            redirectTo: 'dashboard',
            pathMatch: 'full',
          },
        ],
      },

      // MANAGER ROUTES
      {
        path: 'manager',
        canActivate: [roleGuard([Role.MANAGER])],
        children: [
          {
            path: 'dashboard',
            loadComponent: () =>
              import(
                './components/manager-dashboard/manager-dashboard.component'
              ).then((m) => m.ManagerDashboardComponent),
            title: 'Manager Dashboard - Resource Augmentation',
          },
          {
            path: 'leave-management',
            loadComponent: () =>
              import(
                './components/leave-management/leave-management.component'
              ).then((m) => m.LeaveManagementComponent),
            title: 'Leave Management - Resource Augmentation',
          },
          {
            path: 'leave-approvals',
            loadComponent: () =>
              import(
                './components/leave-approvals/leave-approvals.component'
              ).then((m) => m.LeaveApprovalsComponent),
            title: 'Leave Approvals - Resource Augmentation',
          },
          {
            path: 'leave/calendar',
            loadComponent: () =>
              import(
                './components/leave-calendar/leave-calendar.component'
              ).then((m) => m.LeaveCalendarComponent),
            title: 'Leave Calendar - Resource Augmentation',
          },
          {
            path: 'projects',
            component: ManagerProjectComponent,
          },
          {
            path: 'projects/:id',
            component: ProjectDetailsComponent,
          },
          {
            path: 'projects/:id/resources',
            component: ProjectResourcesComponent,
          },
          {
            path: '',
            redirectTo: 'dashboard',
            pathMatch: 'full',
          },
        ],
      },

      // COMPANY ROUTES
      {
        path: 'company',
        canActivate: [roleGuard([Role.COMPANY])],
        children: [
          {
            path: 'dashboard',
            loadComponent: () =>
              import(
                './components/company-dashboard/company-dashboard.component'
              ).then((m) => m.CompanyDashboardComponent),
            title: 'Company Dashboard - Resource Augmentation',
          },
          {
            path: '',
            redirectTo: 'dashboard',
            pathMatch: 'full',
          },
        ],
      },

      // RESOURCE/EMPLOYEE ROUTES
      {
        path: 'resource',
        canActivate: [roleGuard([Role.RESOURCE])],
        children: [
          {
            path: 'dashboard',
            loadComponent: () =>
              import(
                './components/resource-dashboard/resource-dashboard.component'
              ).then((m) => m.ResourceDashboardComponent),
            title: 'Resource Dashboard - Resource Augmentation',
          },
          {
            path: 'projects',
            component: ResourceProjectComponent,
          },
          {
            path: 'projects/:id',
            component: ProjectDetailsComponent,
          },
          {
            path: '',
            redirectTo: 'dashboard',
            pathMatch: 'full',
          },
        ],
      },

      // SHARED LEAVE MANAGEMENT ROUTES

      {
        path: 'leave',
        children: [
          {
            path: 'apply',
            loadComponent: () =>
              import(
                './components/leave-application/leave-application.component'
              ).then((m) => m.LeaveApplicationComponent),
            title: 'Apply for Leave - Resource Augmentation',
          },
          {
            path: 'approvals',
            loadComponent: () =>
              import(
                './components/leave-approvals/leave-approvals.component'
              ).then((m) => m.LeaveApprovalsComponent),
            title: 'Leave Approvals - Resource Augmentation',
            canActivate: [roleGuard([Role.MANAGER, Role.ADMIN])],
          },
          {
            path: 'calendar',
            loadComponent: () =>
              import(
                './components/leave-calendar/leave-calendar.component'
              ).then((m) => m.LeaveCalendarComponent),
            title: 'Leave Calendar - Resource Augmentation',
            canActivate: [roleGuard([Role.MANAGER, Role.ADMIN])],
          },
          {
            path: '',
            redirectTo: 'apply',
            pathMatch: 'full',
          },
        ],
      },

      // PROFILE ROUTES
      {
        path: 'profile',
        children: [
          {
            path: 'complete',
            loadComponent: () =>
              import(
                './components/profile-wizard/profile-wizard.component'
              ).then((m) => m.ProfileWizardComponent),
            title: 'Complete Profile - Resource Augmentation',
          },
          {
            path: 'personal',
            loadComponent: () =>
              import(
                './components/profile-wizard/profile-wizard.component'
              ).then((m) => m.ProfileWizardComponent),
            title: 'Personal Details - Resource Augmentation',
          },
          {
            path: 'education',
            loadComponent: () =>
              import(
                './components/profile-wizard/profile-wizard.component'
              ).then((m) => m.ProfileWizardComponent),
            title: 'Education - Resource Augmentation',
          },
          {
            path: 'employment',
            loadComponent: () =>
              import(
                './components/profile-wizard/profile-wizard.component'
              ).then((m) => m.ProfileWizardComponent),
            title: 'Employment - Resource Augmentation',
          },
          {
            path: 'view',
            loadComponent: () =>
              import('./components/profile-view/profile-view.component').then(
                (m) => m.ProfileViewComponent
              ),
            title: 'My Profile - Resource Augmentation',
          },
          {
            path: '',
            redirectTo: 'view',
            pathMatch: 'full',
          },
        ],
      },
    ],
  },
  {
    path: 'about',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/about/about.component').then(
        (m) => m.AboutComponent
      ),
  },

  // FALLBACK ROUTE
  {
    path: '**',
    redirectTo: '/auth/login',
  },
];
