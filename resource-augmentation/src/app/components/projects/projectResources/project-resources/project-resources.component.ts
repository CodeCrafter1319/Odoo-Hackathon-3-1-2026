import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../../../services/project.service';
import { StorageService } from '../../../../services/storage.service';
import { 
  Project, 
  ProjectResource, 
  AvailableResource,
  AssignResourceDto 
} from '../../../../core/project.model';

@Component({
  selector: 'app-project-resources',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-resources.component.html',
  styleUrls: ['./project-resources.component.css']
})
export class ProjectResourcesComponent implements OnInit {
  project: Project | null = null;
  resources: ProjectResource[] = [];
  availableResources: AvailableResource[] = [];
  loading = true;
  error: string | null = null;
  successMessage: string | null = null;
  projectId: number = 0;

  // Add Resource Modal
  showAddModal = false;
  selectedUserId: number | null = null;
  newAssignment: AssignResourceDto = {
    userId: 0,
    role: '',
    allocationPercentage: 100,
    startDate: '',
    endDate: '',
    notes: ''
  };

  // Remove Resource Confirmation
  showRemoveModal = false;
  resourceToRemove: ProjectResource | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private storageService: StorageService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.projectId = +params['id'];
      if (this.projectId) {
        this.loadProject();
        this.loadResources();
      }
    });
  }

  loadProject(): void {
    this.projectService.getProjectById(this.projectId).subscribe({
      next: (project) => {
        this.project = project;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load project';
        this.loading = false;
        console.error('Error loading project:', error);
      }
    });
  }

  loadResources(): void {
    this.projectService.getProjectResources(this.projectId).subscribe({
      next: (resources) => {
        this.resources = resources;
      },
      error: (error) => {
        console.error('Error loading resources:', error);
      }
    });
  }

  loadAvailableResources(): void {
    this.projectService.getAvailableResources(this.projectId).subscribe({
      next: (resources) => {
        this.availableResources = resources;
      },
      error: (error) => {
        console.error('Error loading available resources:', error);
      }
    });
  }

  openAddModal(): void {
    this.loadAvailableResources();
    this.showAddModal = true;
    this.resetForm();
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.resetForm();
  }

  resetForm(): void {
    this.newAssignment = {
      userId: 0,
      role: '',
      allocationPercentage: 100,
      startDate: '',
      endDate: '',
      notes: ''
    };
    this.selectedUserId = null;
  }

  onResourceSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.newAssignment.userId = +select.value;
  }

  assignResource(): void {
    if (!this.newAssignment.userId) {
      this.error = 'Please select a resource';
      return;
    }

    this.projectService.assignResource(this.projectId, this.newAssignment).subscribe({
      next: () => {
        this.successMessage = 'Resource assigned successfully';
        this.closeAddModal();
        this.loadResources();
        this.loadProject(); // Refresh total count
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to assign resource';
        setTimeout(() => this.error = null, 3000);
      }
    });
  }

  openRemoveModal(resource: ProjectResource): void {
    this.resourceToRemove = resource;
    this.showRemoveModal = true;
  }

  closeRemoveModal(): void {
    this.showRemoveModal = false;
    this.resourceToRemove = null;
  }

  confirmRemoveResource(): void {
    if (!this.resourceToRemove) return;

    this.projectService.removeResource(this.projectId, this.resourceToRemove.UserId).subscribe({
      next: () => {
        this.successMessage = 'Resource removed successfully';
        this.closeRemoveModal();
        this.loadResources();
        this.loadProject(); // Refresh total count
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to remove resource';
        this.closeRemoveModal();
        setTimeout(() => this.error = null, 3000);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/manager/projects']);
  }

  formatDate(date: string | null): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  dismissError(): void {
    this.error = null;
  }

  dismissSuccess(): void {
    this.successMessage = null;
  }
}
