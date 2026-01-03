import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../../../services/project.service';
import { Project, ProjectStatistics } from '../../../core/project.model';

@Component({
  selector: 'app-admin-projects-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-projects-list.component.html',
  styleUrls: ['./admin-projects-list.component.css']
})
export class AdminProjectsListComponent implements OnInit {
  projects: Project[] = [];
  statistics: ProjectStatistics | null = null;
  loading = true;
  error: string | null = null;
  successMessage: string | null = null;

  // Filters
  statusFilter: string = 'ALL';
  searchTerm: string = '';

  constructor(
    private projectService: ProjectService,
    private router: Router
  ) {}

  ngOnInit(): void {
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
      error: (error) => {
        this.error = 'Failed to load projects';
        this.loading = false;
        console.error('Error loading projects:', error);
      }
    });
  }

  loadStatistics(): void {
    this.projectService.getStatistics().subscribe({
      next: (stats) => {
        this.statistics = stats;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
      }
    });
  }

  get filteredProjects(): Project[] {
    let filtered = this.projects;

    // Status filter
    if (this.statusFilter !== 'ALL') {
      filtered = filtered.filter(p => p.Status === this.statusFilter);
    }

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.ProjectName.toLowerCase().includes(term) ||
        p.ProjectCode.toLowerCase().includes(term) ||
        p.ClientName?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  viewProject(projectId: number): void {
    this.router.navigate(['/admin/projects', projectId]);
  }

  createNewProject(): void {
    this.router.navigate(['/admin/projects/create']);
  }

  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'ACTIVE': 'status-active',
      'PLANNING': 'status-planning',
      'ON_HOLD': 'status-on-hold',
      'COMPLETED': 'status-completed',
      'CANCELLED': 'status-cancelled'
    };
    return statusClasses[status] || '';
  }

  getPriorityClass(priority: string): string {
    const priorityClasses: { [key: string]: string } = {
      'LOW': 'priority-low',
      'MEDIUM': 'priority-medium',
      'HIGH': 'priority-high',
      'CRITICAL': 'priority-critical'
    };
    return priorityClasses[priority] || '';
  }

  formatDate(date: any | null): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  setStatusFilter(status: string): void {
    this.statusFilter = status;
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value;
  }

  dismissError(): void {
    this.error = null;
  }

  dismissSuccess(): void {
    this.successMessage = null;
  }
}
