// services/project.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { StorageService } from './storage.service';
import {
  Project,
  ProjectResource,
  CreateProjectDto,
  AssignResourceDto,
  ProjectStatistics,
  ProjectActivity,
} from '../core/project.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private apiUrl = `${environment.apiUrl}/projects`;

  constructor(
    private http: HttpClient,
    private storageService: StorageService,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.storageService.getToken();
    console.log('ProjectService - Token:', token ? 'exists' : 'missing');
    console.log(
      'ProjectService - Token value:',
      token?.substring(0, 20) + '...'
    );
    if (!token) {
      throw new Error('No authentication token found');
    }
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  // Get all projects (filtered by user role)
  getAllProjects(): Observable<Project[]> {
    console.log('Fetching all projects from API:', this.apiUrl);
    return this.http
      .get<any>(`${this.apiUrl}`, { headers: this.getHeaders() })
      .pipe(
        map((response) => response.data || []),
        catchError(this.handleError)
      );
  }

  // Get single project details
  getProjectById(id: number): Observable<Project> {
    return this.http
      .get<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(
        map((response) => response.data),
        catchError(this.handleError)
      );
  }

  // Create new project
  createProject(project: CreateProjectDto): Observable<Project> {
    return this.http
      .post<any>(`${this.apiUrl}`, project, { headers: this.getHeaders() })
      .pipe(
        map((response) => response.data),
        catchError(this.handleError)
      );
  }

  // Update project
  updateProject(
    id: number,
    project: Partial<CreateProjectDto>
  ): Observable<Project> {
    return this.http
      .put<any>(`${this.apiUrl}/${id}`, project, { headers: this.getHeaders() })
      .pipe(
        map((response) => response.data),
        catchError(this.handleError)
      );
  }

  // Delete project
  deleteProject(id: number): Observable<any> {
    return this.http
      .delete<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  // Get project resources
  getProjectResources(projectId: number): Observable<ProjectResource[]> {
    return this.http
      .get<any>(`${this.apiUrl}/${projectId}/resources`, {
        headers: this.getHeaders(),
      })
      .pipe(
        map((response) => response.data || []),
        catchError(this.handleError)
      );
  }

  // Get available resources for assignment
  getAvailableResources(projectId: number): Observable<any[]> {
    return this.http
      .get<any>(`${this.apiUrl}/${projectId}/available-resources`, {
        headers: this.getHeaders(),
      })
      .pipe(
        map((response) => response.data || []),
        catchError(this.handleError)
      );
  }

  // Assign resource to project
  assignResource(
    projectId: number,
    assignment: AssignResourceDto
  ): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/${projectId}/resources`, assignment, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  // Remove resource from project
  removeResource(projectId: number, userId: number): Observable<any> {
    return this.http
      .delete<any>(`${this.apiUrl}/${projectId}/resources/${userId}`, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  // Get project statistics
  getStatistics(): Observable<ProjectStatistics> {
    return this.http
      .get<any>(`${this.apiUrl}/statistics`, { headers: this.getHeaders() })
      .pipe(
        map((response) => response.data),
        catchError(this.handleError)
      );
  }

  // Get project activity log
  getProjectActivity(projectId: number): Observable<ProjectActivity[]> {
    return this.http
      .get<any>(`${this.apiUrl}/${projectId}/activity`, {
        headers: this.getHeaders(),
      })
      .pipe(
        map((response) => response.data || []),
        catchError(this.handleError)
      );
  }

  // Cache project data locally (optional for offline support)
  cacheProject(project: Project): void {
    this.storageService.setObject(`project_${project.Id}`, project);
  }

  getCachedProject(projectId: number): Project | null {
    return this.storageService.getObject<Project>(`project_${projectId}`);
  }

  clearProjectCache(): void {
    const keys = this.storageService.getAllKeys();
    keys.forEach((key) => {
      if (key.startsWith('project_')) {
        this.storageService.removeItem(key);
      }
    });
  }

  private handleError(error: any) {
    console.error('Project service error:', error);
    return throwError(() => error);
  }
  getProjects(): Observable<any> {
    return this.http.get(`${this.apiUrl}/projects`, {
      headers: this.authHeaders(),
    });
  }
  private authHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }
}
