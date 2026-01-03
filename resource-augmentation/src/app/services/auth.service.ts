// services/auth.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  tap,
  Observable,
  throwError,
  of,
} from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { StorageService } from './storage.service';
import {
  ApiResponse,
  AuthResponse,
  CreateUserRequest,
  EducationDetailsResponse,
  EducationRequest,
  EmailVerificationResponse,
  EmploymentDetailsResponse,
  EmploymentRequest,
  LoginRequest,
  PersonalDetailsRequest,
  PersonalDetailsResponse,
  ProfileStatusResponse,
  SetPasswordRequest,
  User,
  Role,
} from '../core/user.model';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  getPersonal() {
    throw new Error('Method not implemented.');
  }
  private readonly API_URL =environment.apiUrl;
  private readonly TOKEN_KEY = 'auth_token';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  private initializationPromise: Promise<void> | null = null;
  private isInitialized = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private storageService: StorageService
  ) {
    // Delay initialization to avoid SSR issues
    if (typeof window !== 'undefined') {
      setTimeout(() => this.initialize(), 100);
    }
  }

  private async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initializeAuthState();
    return this.initializationPromise;
  }

  private async initializeAuthState(): Promise<void> {
    const token = this.getToken();

    if (!token) {
      this.setUnauthenticated();
      this.isInitialized = true;
      return;
    }

    if (this.isTokenExpired(token)) {
      this.clearAuthData();
      this.isInitialized = true;
      return;
    }

    try {
      const response = await this.getProfile().toPromise();
      if (response && response.success) {
        this.currentUserSubject.next(response.data);
        this.isLoggedInSubject.next(true);
      } else {
        throw new Error('Invalid profile response');
      }
    } catch (error) {
      // Don't clear auth data immediately - give user a chance
      this.setUnauthenticated();
    }

    this.isInitialized = true;
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap((response) => {
          if (response.success) {
            this.setAuthData(response.data.token, response.data.user);
          }
        }),
        catchError((error) => {
          return throwError(() => error.error?.message || 'Login failed');
        })
      );
  }

  logout(): void {
    this.clearAuthData();
    this.router.navigate(['/auth/login']);
  }

  getProfile(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/auth/profile`);
  }

  createUser(userData: CreateUserRequest): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.API_URL}/company/create-user`, userData)
      .pipe(
        catchError((err) => {
          console.error('Create user error:', err);
          return of({
            success: false,
            message: 'Failed to create user',
            data: null,
          });
        })
      );
  }

  getAllUsers(): Observable<ApiResponse<User[]>> {
    return this.http
      .get<ApiResponse<User[]>>(`${this.API_URL}/company/users`)
      .pipe(
        catchError((err) => {
          console.error('Get all users error:', err);
          return of({
            success: false,
            message: 'Failed to fetch users',
            data: [],
          });
        })
      );
  }
  getAvailableManagers(): Observable<any> {
    return this.http.get(`${this.API_URL}/manager/getAvailableManagers`).pipe(
      catchError((error) => {
        console.error('Get managers error:', error);
        return of({
          success: false,
          message: 'Failed to load managers',
          data: [],
        });
      })
    );
  }
  // Email verification Methods
  checkVerificationToken(token: string): Observable<ApiResponse> {
    return this.http
      .get<ApiResponse>(`${this.API_URL}/auth/check-token/${token}`)
      .pipe(
        catchError((err) => {
          console.error('Check verification token error:', err);
          return of({
            success: false,
            message: 'Failed to check verification token',
            data: null,
          });
        })
      );
  }

  //verify email with token
  verifyEmail(token: string): Observable<EmailVerificationResponse> {
    return this.http.get<EmailVerificationResponse>(
      `${this.API_URL}/auth/verify-email/${token}`
    );
  }

  //set password after email verfication
  setPassword(data: SetPasswordRequest): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.API_URL}/auth/set-password`, data)
      .pipe(
        catchError((error) => {
          console.error('Set password error:', error);
          return of({
            success: false,
            message: 'Failed to set password',
            data: null,
          });
        })
      );
  }

  //resend email verification
  resendVerificationEmail(email: string): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.API_URL}/auth/resend-verification`, { email })
      .pipe(
        catchError((error) => {
          console.error('Resend verification email error:', error);
          return of({
            success: false,
            message: 'Failed to resend verification email',
            data: null,
          });
        })
      );
  }

  //Get profile Completion status
  getProfileStatus(): Observable<ApiResponse<any>> {
  return this.http
    .get<ApiResponse<any>>(`${this.API_URL}/auth/profile/status`)
    .pipe(
      catchError((err) => {
        console.error('getProfileStatus error:', err);
        return of({
          success: false,
          message: err?.error?.message || 'Failed to fetch profile status',
          data: null,
        } as ApiResponse<any>);
      })
    );
}


  // Update Personal Details
  updatePersonalDetails(data: PersonalDetailsRequest): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.API_URL}/resource/profile/personal`, data)
      .pipe(
        catchError((error) => {
          console.error('Update personal details error:', error);
          return of({
            success: false,
            message: 'Failed to update personal details',
            data: null,
          });
        })
      );
  }
  // Get Personal Details
  getPersonalDetails(): Observable<PersonalDetailsResponse> {
    return this.http
      .get<PersonalDetailsResponse>(`${this.API_URL}/resource/profile/personal`)
      .pipe(
        catchError((error) => {
          console.error('Get personal details error:', error);
          return of({
            success: false,
            message: 'Failed to fetch personal details',
            data: null,
          });
        })
      );
  }

  // Get Education Details
  getEducationDetails(): Observable<EducationDetailsResponse> {
    return this.http
      .get<EducationDetailsResponse>(
        `${this.API_URL}/resource/profile/education`
      )
      .pipe(
        catchError((error) => {
          console.error('Get education details error:', error);
          return of({
            success: false,
            message: 'Failed to fetch education details',
            data: null,
          });
        })
      );
  }

  // Get Employment Details
  getEmploymentDetails(): Observable<EmploymentDetailsResponse> {
    return this.http
      .get<EmploymentDetailsResponse>(
        `${this.API_URL}/resource/profile/employment`
      )
      .pipe(
        catchError((error) => {
          console.error('Get employment details error:', error);
          return of({
            success: false,
            message: 'Failed to fetch employment details',
            data: null,
          });
        })
      );
  }
  // Add Education
  addEducation(data: EducationRequest): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.API_URL}/resource/profile/education`, data)
      .pipe(
        catchError((error) => {
          console.error('Add education error:', error);
          return of({
            success: false,
            message: 'Failed to add education',
            data: null,
          });
        })
      );
  }

  // Add Employment
  addEmployment(data: EmploymentRequest): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.API_URL}/resource/profile/employment`, data)
      .pipe(
        catchError((error) => {
          console.error('Add employment error:', error);
          return of({
            success: false,
            message: 'Failed to add employment',
            data: null,
          });
        })
      );
  }

  private setAuthData(token: string, user: User): void {
    this.storageService.setItem(this.TOKEN_KEY, token);
    this.currentUserSubject.next(user);
    this.isLoggedInSubject.next(true);
    this.navigateAfterLogin(user.role);
  }

  private clearAuthData(): void {
    this.storageService.removeItem(this.TOKEN_KEY);
    this.setUnauthenticated();
  }

  private setUnauthenticated(): void {
    this.currentUserSubject.next(null);
    this.isLoggedInSubject.next(false);
  }

  getToken(): string | null {
    return this.storageService.getItem(this.TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    const isValid = token !== null && !this.isTokenExpired(token);
    return isValid;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  private isTokenExpired(token: string): boolean {
    try {
      const decoded: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      const isExpired = decoded.exp < currentTime;

      if (isExpired) {
        console.log('Token expired at:', new Date(decoded.exp * 1000));
      }

      return isExpired;
    } catch (error) {
      console.error('Token decode error:', error);
      return true;
    }
  }

  private navigateAfterLogin(role: Role): void {
    switch (role) {
      case Role.ADMIN:
        this.router.navigate(['/admin/dashboard']);
        break;
      case Role.COMPANY:
        this.router.navigate(['/company/dashboard']);
        break;
      case Role.RESOURCE:
        this.router.navigate(['/resource/dashboard']);
        break;
      case Role.MANAGER:
        this.router.navigate(['/manager/dashboard']);
        break;
      default:
        this.router.navigate(['/admin/dashboard']);
    }
  }

  hasRole(allowedRoles: Role[]): boolean {
    const currentUser = this.currentUserSubject.value;
    return currentUser ? allowedRoles.includes(currentUser.role) : false;
  }

  // Ensure initialization before critical operations
  async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
  isAdmin(): boolean {
    const currentUser = this.getCurrentUser();
    return currentUser?.role === Role.ADMIN;
  }

  // Check if current user needs profile completion
  async checkProfileCompletion(): Promise<string | null> {
    try {
      const status = await this.getProfileStatus().toPromise();
      if (status?.success) {
        return status.data.nextStep === 'complete'
          ? null
          : status.data.nextStep;
      }
      return null;
    } catch (error) {
      console.error('Profile status check error:', error);
      return null;
    }
  }
  deleteUser(userId: number): Observable<ApiResponse<any>> {
    return this.http
      .delete<ApiResponse<any>>(`${this.API_URL}/company/users/${userId}`)
      .pipe(
        catchError((error) => {
          console.error('Delete user error:', error);
          return of({
            success: false,
            message: error.error?.message || 'Failed to delete user',
            data: null,
          });
        })
      );
  }
  getUserDetails(userId: number): Observable<ApiResponse<any>> {
    return this.http
      .get<ApiResponse<any>>(`${this.API_URL}/company/users/${userId}/details`)
      .pipe(
        catchError((error) => {
          console.error('Get user details error:', error);
          return of({
            success: false,
            message: 'Failed to load user details',
            data: null,
          });
        })
      );
  }
  getCurrentUserProfile(): Observable<ApiResponse<any>> {
    return this.http
      .get<ApiResponse<any>>(`${this.API_URL}/auth/profile/complete`)
      .pipe(
        catchError((error) => {
          console.error('Get current user profile error:', error);
          return of({
            success: false,
            message: 'Failed to load profile details',
            data: null,
          });
        })
      );
  }
  // Save multiple education records
  saveEducations(educations: EducationRequest[]): Observable<ApiResponse<any>> {
    return this.http
      .post<ApiResponse<any>>(`${this.API_URL}/auth/profile/educations`, {
        educations,
      })
      .pipe(
        catchError((error) => {
          console.error('Save educations error:', error);
          return of({
            success: false,
            message: 'Failed to save education records',
            data: null,
          });
        })
      );
  }
  createEducation(payload: EducationRequest): Observable<ApiResponse<any>> {
    return this.saveEducations([payload]);
  }
  updateEducation(
    id: number,
    payload: EducationRequest
  ): Observable<ApiResponse<any>> {
    const p: any = { ...payload, id: id };
    return this.saveEducations([p]);
  }
  getEducations(): Observable<ApiResponse<any[]>> {
    return this.http
      .get<ApiResponse<any[]>>(`${this.API_URL}/auth/profile/educations`)
      .pipe(
        catchError((err) => {
          console.error('getEducations error:', err);
          return of({
            success: false,
            message: err?.error?.message || 'Failed to fetch educations',
            data: [],
          } as ApiResponse<any[]>);
        })
      );
  }
  deleteEducation(id: number): Observable<ApiResponse<any>> {
    return this.http
      .delete<ApiResponse<any>>(`${this.API_URL}/auth/profile/educations/${id}`)
      .pipe(
        catchError((err) => {
          console.error('deleteEducation error:', err);
          return of({
            success: false,
            message: err?.error?.message || 'Failed to delete education',
            data: null,
          } as ApiResponse<any>);
        })
      );
  }

  // Save multiple employment records
  saveEmployments(
    employments: EmploymentRequest[]
  ): Observable<ApiResponse<any>> {
    return this.http
      .post<ApiResponse<any>>(`${this.API_URL}/auth/profile/employments`, {
        employments,
      })
      .pipe(
        catchError((error) => {
          console.error('Save employments error:', error);
          return of({
            success: false,
            message: 'Failed to save employment records',
            data: null,
          });
        })
      );
  }
  createEmployment(payload: EmploymentRequest): Observable<ApiResponse<any>> {
    return this.saveEmployments([payload]);
  }
  updateEmployment(
    id: number,
    payload: EmploymentRequest
  ): Observable<ApiResponse<any>> {
    const p: any = { ...payload, Id: id };
    return this.saveEmployments([p]);
  }
  getEmployments(): Observable<ApiResponse<any[]>> {
    return this.http
      .get<ApiResponse<any[]>>(`${this.API_URL}/auth/profile/employments`)
      .pipe(
        catchError((err) => {
          console.error('getEmployments error:', err);
          return of({
            success: false,
            message: err?.error?.message || 'Failed to fetch employments',
            data: [],
          } as ApiResponse<any[]>);
        })
      );
  }
  deleteEmployment(id: number): Observable<ApiResponse<any>> {
    return this.http
      .delete<ApiResponse<any>>(
        `${this.API_URL}/auth/profile/employments/${id}`
      )
      .pipe(
        catchError((err) => {
          console.error('deleteEmployment error:', err);
          return of({
            success: false,
            message: err?.error?.message || 'Failed to delete employment',
            data: null,
          } as ApiResponse<any>);
        })
      );
  }

  savePersonal(payload: any): Observable<ApiResponse<any>> {
  return this.http
    .post<ApiResponse<any>>(
      `${this.API_URL}/auth/profile/complete`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    )
    .pipe(
      catchError((err) => {
        console.error('savePersonal error:', err);
        return of({
          success: false,
          message: err?.error?.message || 'Failed to save personal details',
          data: null,
        } as ApiResponse<any>);
      })
    );
}

  // Get all education records
  getAllEducations(): Observable<ApiResponse<any[]>> {
    return this.http
      .get<ApiResponse<any[]>>(`${this.API_URL}/auth/profile/educations`)
      .pipe(
        catchError((error) => {
          console.error('Get all educations error:', error);
          return of({
            success: false,
            message: 'Failed to fetch education records',
            data: [],
          });
        })
      );
  }

  // Get all employment records
  getAllEmployments(): Observable<ApiResponse<any[]>> {
    return this.http
      .get<ApiResponse<any[]>>(`${this.API_URL}/auth/profile/employments`)
      .pipe(
        catchError((error) => {
          console.error('Get all employments error:', error);
          return of({
            success: false,
            message: 'Failed to fetch employment records',
            data: [],
          });
        })
      );
  }
  getLanguages(): Observable<any> {
  return this.http.get(`${this.API_URL}/auth/profile/languages`);
}

saveLanguages(languages: any[]): Observable<any> {
  return this.http.post(`${this.API_URL}/auth/profile/languages`, { languages });
}

deleteLanguage(id: number): Observable<any> {
  return this.http.delete(`${this.API_URL}/auth/profile/languages/${id}`);
}

// Certifications
getCertifications(): Observable<any> {
  return this.http.get(`${this.API_URL}/auth/profile/certifications`);
}

saveCertifications(certifications: any[]): Observable<any> {
  return this.http.post(`${this.API_URL}/auth/profile/certifications`, { certifications });
}

deleteCertification(id: number): Observable<any> {
  return this.http.delete(`${this.API_URL}/auth/profile/certifications/${id}`);
}

// Projects
getProjects(): Observable<any> {
  return this.http.get(`${this.API_URL}/auth/profile/projects`);
}

saveProjects(projects: any[]): Observable<any> {
  return this.http.post(`${this.API_URL}/auth/profile/projects`, { projects });
}

deleteProject(id: number): Observable<any> {
  return this.http.delete(`${this.API_URL}/auth/profile/projects/${id}`);
}
}
