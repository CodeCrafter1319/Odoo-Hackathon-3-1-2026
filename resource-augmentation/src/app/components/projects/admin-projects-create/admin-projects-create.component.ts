import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { Router } from '@angular/router';

import { CreateProjectDto } from '../../../core/project.model';
import { ProjectService } from '../../../services/project.service';
import { AuthService } from '../../../services/auth.service';

interface Manager {
  Id: number;
  Name: string;
  Email: string;
}

@Component({
  selector: 'app-admin-projects-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-projects-create.component.html',
  styleUrls: ['./admin-projects-create.component.css']
})
export class AdminProjectsCreateComponent implements OnInit {
  projectForm!: FormGroup;
  managers: Manager[] = [];
  loading = false;
  submitting = false;
  error: string | null = null;
  
  projectStatuses = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
  projectTypes = ['INTERNAL', 'CLIENT', 'RND'];
  priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  
  commonTechnologies = [
    'Angular', 'React', 'Vue.js', 'Node.js', 'Express', 
    'MongoDB', 'PostgreSQL', 'MySQL', 'Python', 'Java',
    'Spring Boot', 'Docker', 'Kubernetes', 'AWS', 'Azure'
  ];

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private authService: AuthService,
    private router: Router
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadManagers();
  }

  initializeForm(): void {
    this.projectForm = this.fb.group({
      projectName: ['', [Validators.required, Validators.maxLength(200)]],
      projectCode: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', [Validators.required, Validators.maxLength(1000)]],
      clientName: ['', Validators.maxLength(200)],
      projectType: ['CLIENT', Validators.required],
      managerId: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: [''],
      estimatedEndDate: [''],
      status: ['PLANNING', Validators.required],
      priority: ['MEDIUM', Validators.required],
      technologies: this.fb.array([]),
      projectStack: [''],
      domain: [''],
      estimatedBudget: [''],
      currency: ['USD'],
      projectLocation: [''],
      documentationUrl: [''],
      repositoryUrl: ['']
    });
  }

  get technologies(): FormArray {
    return this.projectForm.get('technologies') as FormArray;
  }

  addTechnology(tech: string = ''): void {
    this.technologies.push(this.fb.control(tech, Validators.required));
  }

  removeTechnology(index: number): void {
    this.technologies.removeAt(index);
  }

  addCommonTechnology(tech: string): void {
    const existing = this.technologies.controls.find(c => c.value === tech);
    if (!existing) {
      this.addTechnology(tech);
    }
  }

  loadManagers(): void {
    this.loading = true;
    this.authService.getAvailableManagers().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.managers = response.data;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading managers:', error);
        this.error = 'Failed to load managers';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.projectForm.invalid) {
      Object.keys(this.projectForm.controls).forEach(key => {
        const control = this.projectForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      return;
    }

    this.submitting = true;
    this.error = null;

    const formValue = this.projectForm.value;
    
    // Format data for backend - match CreateProjectDto interface
    const projectData: CreateProjectDto = {
      projectName: formValue.projectName.trim(),
      projectCode: formValue.projectCode.trim().toUpperCase(),
      description: formValue.description.trim() || undefined,
      clientName: formValue.clientName?.trim() || undefined,
      projectType: formValue.projectType,
      status: formValue.status,
      startDate: formValue.startDate,
      endDate: formValue.endDate || undefined,
      estimatedEndDate: formValue.estimatedEndDate || undefined,
      technologies: formValue.technologies.filter((t: string) => t.trim()),
      projectStack: formValue.projectStack?.trim() || undefined,
      domain: formValue.domain?.trim() || undefined,
      managerId: parseInt(formValue.managerId),
      priority: formValue.priority,
      projectLocation: formValue.projectLocation?.trim() || undefined,
      documentationUrl: formValue.documentationUrl?.trim() || undefined,
      repositoryUrl: formValue.repositoryUrl?.trim() || undefined,
      estimatedBudget: formValue.estimatedBudget ? parseFloat(formValue.estimatedBudget) : undefined,
      currency: formValue.currency || 'USD'
    };

    console.log('Submitting project data:', projectData);

    this.projectService.createProject(projectData).subscribe({
      next: (response) => {
        console.log('Project created successfully:', response);
        this.router.navigate(['/admin/projects']);
      },
      error: (error) => {
        console.error('Error creating project:', error);
        this.error = error.error?.message || 'Failed to create project. Please try again.';
        this.submitting = false;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/admin/projects']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.projectForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.projectForm.get(fieldName);
    if (field?.hasError('required')) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }
    if (field?.hasError('maxlength')) {
      const maxLength = field.errors?.['maxlength'].requiredLength;
      return `${this.getFieldLabel(fieldName)} cannot exceed ${maxLength} characters`;
    }
    return '';
  }

  getFieldLabel(fieldName: string): string {
    const labels: {[key: string]: string} = {
      projectName: 'Project name',
      projectCode: 'Project code',
      description: 'Description',
      clientName: 'Client name',
      projectType: 'Project type',
      managerId: 'Manager',
      startDate: 'Start date',
      status: 'Status',
      priority: 'Priority'
    };
    return labels[fieldName] || fieldName;
  }
}
