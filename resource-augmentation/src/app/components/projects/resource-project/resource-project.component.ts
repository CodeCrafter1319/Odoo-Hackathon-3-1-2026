import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Project } from '../../../core/project.model';
import { ProjectService } from '../../../services/project.service';
import { StorageService } from '../../../services/storage.service';
import { Router } from '@angular/router';
import { CANCELLED } from 'dns';

@Component({
  selector: 'app-resource-project',
  imports: [CommonModule],
  templateUrl: './resource-project.component.html',
  styleUrl: './resource-project.component.css',
})
export class ResourceProjectComponent implements OnInit {
  projects: Project[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private projectService: ProjectService,
    private storageService: StorageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProjects();
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
  viewProject(projectId: number): void {
    this.router.navigate(['/resource/projects', projectId]);
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
      day: 'numeric',
    });
  }
  dismissError(): void {
    this.error = null;
  }
}
