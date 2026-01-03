import { Component, OnInit } from '@angular/core';
import { Project, ProjectStatistics } from '../../../core/project.model';
import { ProjectService } from '../../../services/project.service';
import { StorageService } from '../../../services/storage.service';
import { Router } from '@angular/router';
import { timeStamp } from 'console';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-manager-project',
  imports: [CommonModule],
  templateUrl: './manager-project.component.html',
  styleUrl: './manager-project.component.css',
})
export class ManagerProjectComponent implements OnInit {
  projects: Project[] = [];
  statistics: ProjectStatistics | null = null;
  loading = true;
  error: string | null = null;
  successMessage: string | null = null;
  userRole: string | null = null;

  statusFilter: string = 'ALL';
  searchterm: string = '';

  constructor(
    private projectService: ProjectService,
    private storageService: StorageService,
    private router: Router
  ) {}
  ngOnInit(): void {
    this.userRole = this.storageService.getUserRole();
    this.loadProjects();
    this.loadStatistics();
  }
  loadProjects(): void {
    this.loading = true;
    this.projectService.getAllProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load projects.';
        this.loading = false;
        console.error('Error loading projects:', err);
      },
    });
  }
  loadStatistics(): void {
    this.projectService.getStatistics().subscribe({
      next: (stats) => {
        this.statistics = stats;
      },
      error: (err) => {
        console.error('Error loading statistics:', err);
      },
    });
  }
  get filteredProjects(): Project[] {
    let filtered = this.projects;
    if (this.statusFilter !== 'ALL') {
      filtered = filtered.filter(
        (p) => p.Status?.toUpperCase() === this.statusFilter.toUpperCase()
      );
    }
    if (this.searchterm) {
      const term = this.searchterm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.ProjectName.toLowerCase().includes(term) ||
          p.ProjectCode.toLowerCase().includes(term) ||
          p.ClientName?.toLowerCase().includes(term)
      );
    }
    return filtered;
  }
  viewProject(projectId: number): void {
    this.router.navigate(['/manager/projects', projectId]);
  }
  manageResources(projectId: number): void {
    this.router.navigate(['/manager/projects', projectId, 'resources']);
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
  formatDate(date: any): string {
    if (!date) {
      return 'N/A';
    }
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  }
  setStatusFilter(status: string): void {
    this.statusFilter = status;
  }
  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchterm = input.value;
  }
  dismissError(): void {
    this.error = null;
  }
  dismissSuccess(): void {
    this.successMessage = null;
  }
}
