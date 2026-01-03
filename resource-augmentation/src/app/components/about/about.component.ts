import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface Step {
  number: number;
  title: string;
  description: string;
  userType: 'admin' | 'manager' | 'resource';
}

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css'
})
export class AboutComponent {
  
  constructor(private router: Router) {}

  features: Feature[] = [
    {
      icon: '👥',
      title: 'User Management',
      description: 'Admins can easily create and manage employee and manager accounts with role-based access control.'
    },
    {
      icon: '📧',
      title: 'Email Integration',
      description: 'Automated email notifications for account setup, leave applications, and approval decisions.'
    },
    {
      icon: '👤',
      title: 'Profile Management',
      description: 'Employees can build comprehensive profiles including education, employment history, and certifications.'
    },
    {
      icon: '📄',
      title: 'Auto CV Generation',
      description: 'Automatically generate professional CVs from employee profile data in multiple formats.'
    },
    {
      icon: '🏖️',
      title: 'Leave Management',
      description: 'Complete leave management system with automatic monthly accruals, paid/unpaid leaves, and approval workflows.'
    },
    {
      icon: '📊',
      title: 'Manager Dashboard',
      description: 'Dedicated dashboard for managers to review team leave applications and track availability.'
    },
    {
      icon: '📅',
      title: 'Leave Calendar',
      description: 'Visual calendar interface to view team leave schedules and plan resources effectively.'
    },
    {
      icon: '🔔',
      title: 'Real-time Notifications',
      description: 'Instant notifications for leave requests, approvals, rejections, and important updates.'
    }
  ];

  workflowSteps: Step[] = [
    {
      number: 1,
      title: 'Admin Registration',
      description: 'Admin account is pre-configured in the database with full system access.',
      userType: 'admin'
    },
    {
      number: 2,
      title: 'Add Employees & Managers',
      description: 'Admin creates accounts for resources and managers through the admin dashboard.',
      userType: 'admin'
    },
    {
      number: 3,
      title: 'Email Verification',
      description: 'New users receive an email with a link to set up their password and activate their account.',
      userType: 'resource'
    },
    {
      number: 4,
      title: 'First Login',
      description: 'Users sign in with their email and newly created password to access the platform.',
      userType: 'resource'
    },
    {
      number: 5,
      title: 'Complete Profile',
      description: 'Employees fill in personal details, education, employment history, certifications, projects, and languages.',
      userType: 'resource'
    },
    {
      number: 6,
      title: 'Auto CV Generation',
      description: 'System automatically generates a professional CV based on the completed profile information.',
      userType: 'resource'
    },
    {
      number: 7,
      title: 'Leave Balance Setup',
      description: 'Initial leave balance is allocated to each employee. Monthly accruals are automatically added.',
      userType: 'admin'
    },
    {
      number: 8,
      title: 'Apply for Leave',
      description: 'Employees submit leave applications through their dashboard for both paid and unpaid leaves.',
      userType: 'resource'
    },
    {
      number: 9,
      title: 'Manager Notification',
      description: 'Manager receives an email notification about the leave request with all details.',
      userType: 'manager'
    },
    {
      number: 10,
      title: 'Leave Approval/Rejection',
      description: 'Manager reviews and approves or rejects the leave request with optional comments.',
      userType: 'manager'
    },
    {
      number: 11,
      title: 'Employee Notification',
      description: 'Employee receives an email with the decision and can view the status in their dashboard.',
      userType: 'resource'
    },
    {
      number: 12,
      title: 'Leave Calendar View',
      description: 'Both managers and admins can view team leave schedules on an interactive calendar.',
      userType: 'manager'
    }
  ];

  getUserTypeClass(userType: string): string {
    switch(userType) {
      case 'admin': return 'user-type-admin';
      case 'manager': return 'user-type-manager';
      case 'resource': return 'user-type-resource';
      default: return '';
    }
  }

  getUserTypeBadge(userType: string): string {
    switch(userType) {
      case 'admin': return 'Admin';
      case 'manager': return 'Manager';
      case 'resource': return 'Employee';
      default: return '';
    }
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
