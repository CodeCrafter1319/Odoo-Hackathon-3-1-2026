import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../core/user.model';
import { HttpClient } from '@angular/common/http';
import { catchError, finalize, of, Subscription } from 'rxjs';
import { saveAs } from 'file-saver';
import { ResumeDesignerComponent } from '../resume-designer/resume-designer.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

interface ProfileData {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  linkedInProfile?: string;
  gitHubProfile?: string;
  portfolioWebsite?: string;
  degree?: string;
  fieldOfStudy?: string;
  institution?: string;
  educationStartDate?: string;
  educationEndDate?: string;
  grade?: string;
  educationDescription?: string;
  jobTitle?: string;
  companyName?: string;
  location?: string;
  employmentStartDate?: string;
  employmentEndDate?: string;
  employmentDescription?: string;
  skills?: string[];
  isCurrentJob?: boolean;
  educations?: Education[];
  employments?: Employment[];
  languages?: Language[];
  certifications?: Certification[];
  projects?: Project[];
}

interface Education {
  Id?: number;
  Degree: string;
  FieldOfStudy: string;
  Institution: string;
  StartDate: string;
  EndDate?: string | null;
  Grade?: string | null;
  Description?: string | null;
}

interface Employment {
  Id?: number;
  JobTitle: string;
  CompanyName: string;
  Location?: string | null;
  StartDate: string;
  EndDate?: string | null;
  Description?: string | null;
  Skills: string[];
  IsCurrentJob?: boolean;
}

interface Language {
  Id?: number;
  Name: string;
  Level: string;
}

interface Certification {
  Id?: number;
  Title: string;
  IssuingOrganization?: string;
  IssueDate?: string;
  ExpiryDate?: string;
  CredentialId?: string;
  Link?: string;
  Description?: string;
}

interface Project {
  Id?: number;
  Title: string;
  Description?: string;
  Technologies: string[];
  Link?: string;
  StartDate?: string;
  EndDate?: string;
  IsOngoing?: boolean;
}

@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [
    CommonModule,
    ResumeDesignerComponent,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './profile-view.component.html',
  styleUrl: './profile-view.component.css',
})
export class ProfileViewComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private http = inject(HttpClient);
  
  currentUser: User | null = null;
  profileData: ProfileData | null = null;
  isLoading = true;
  isDownloading = false;
  errorMessage = '';
  showResumePreview = false;
  private subs: Subscription[] = [];

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser) {
      this.loadProfileData();
    } else {
      this.router.navigate(['/auth/login']);
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  /* ---------- Data loading ---------- */
  public loadProfileData(): void {
    this.isLoading = true;
    const s = this.authService.getCurrentUserProfile().subscribe({
      next: (response: any) => {
        if (response && response.success && response.data) {
          this.profileData = {
            ...response.data,
            educations: response.data.educations || [],
            employments: response.data.employments || [],
            languages: response.data.languages || [],
            certifications: response.data.certifications || [],
            projects: response.data.projects || [],
            summary: response.data.summary || response.data.about || '',
          } as ProfileData;
          this.loadAllEducationRecords();
          this.loadAllEmploymentRecords();
          this.loadAllLanguages();
          this.loadAllCertifications();
          this.loadAllProjects();
        } else {
          this.errorMessage = 'Failed to load profile data';
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load profile data:', err);
        this.errorMessage = err?.message || 'Failed to load profile data';
        this.isLoading = false;
      },
    });
    this.subs.push(s);
  }

  loadAllEducationRecords(): void {
    const s = this.authService.getAllEducations().subscribe({
      next: (response: any) => {
        if (response && response.success && response.data) {
          if (!this.profileData) this.profileData = {} as ProfileData;
          this.profileData.educations = response.data;
        }
      },
      error: (err) => {
        console.warn('Failed to load education records:', err);
      },
    });
    this.subs.push(s);
  }

  loadAllEmploymentRecords(): void {
    const s = this.authService.getAllEmployments().subscribe({
      next: (response: any) => {
        if (response && response.success && response.data) {
          if (!this.profileData) this.profileData = {} as ProfileData;
          this.profileData.employments = (response.data || []).map(
            (emp: any) => ({
              ...emp,
              Skills: this.parseSkills(emp.Skills),
            })
          );
        }
      },
      error: (err) => {
        console.warn('Failed to load employment records:', err);
      },
    });
    this.subs.push(s);
  }

  loadAllLanguages(): void {
    const s = this.authService.getLanguages().subscribe({
      next: (response: any) => {
        if (response && response.success && response.data) {
          if (!this.profileData) this.profileData = {} as ProfileData;
          this.profileData.languages = response.data;
        }
      },
      error: (err) => {
        console.warn('Failed to load languages:', err);
      },
    });
    this.subs.push(s);
  }

  loadAllCertifications(): void {
    const s = this.authService.getCertifications().subscribe({
      next: (response: any) => {
        if (response && response.success && response.data) {
          if (!this.profileData) this.profileData = {} as ProfileData;
          this.profileData.certifications = response.data;
        }
      },
      error: (err) => {
        console.warn('Failed to load certifications:', err);
      },
    });
    this.subs.push(s);
  }

  loadAllProjects(): void {
    const s = this.authService.getProjects().subscribe({
      next: (response: any) => {
        if (response && response.success && response.data) {
          if (!this.profileData) this.profileData = {} as ProfileData;
          this.profileData.projects = (response.data || []).map(
            (proj: any) => ({
              ...proj,
              Technologies: this.parseSkills(proj.Technologies || proj.technologies),
            })
          );
        }
      },
      error: (err) => {
        console.warn('Failed to load projects:', err);
      },
    });
    this.subs.push(s);
  }

  private parseSkills(skills: any): string[] {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;
    if (typeof skills === 'string') {
      try {
        const parsed = JSON.parse(skills);
        return Array.isArray(parsed)
          ? parsed
          : skills
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
      } catch {
        return skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    return [];
  }

  /* ---------- UI helpers ---------- */
  getUserInitials(): string {
    if (!this.currentUser) return '';
    return `${this.currentUser.firstName?.[0] || ''}${
      this.currentUser.lastName?.[0] || ''
    }`.toUpperCase();
  }

  hasPersonalDetails(): boolean {
    return !!(
      this.profileData?.phone ||
      this.profileData?.dateOfBirth ||
      this.profileData?.gender ||
      this.profileData?.address
    );
  }

  hasEducationDetails(): boolean {
    return !!(
      this.profileData?.educations && this.profileData.educations.length > 0
    );
  }

  hasEmploymentDetails(): boolean {
    return !!(
      this.profileData?.employments && this.profileData.employments.length > 0
    );
  }

  hasLanguages(): boolean {
    return !!(
      this.profileData?.languages && this.profileData.languages.length > 0
    );
  }

  hasCertifications(): boolean {
    return !!(
      this.profileData?.certifications && this.profileData.certifications.length > 0
    );
  }

  hasProjects(): boolean {
    return !!(
      this.profileData?.projects && this.profileData.projects.length > 0
    );
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  }

  getStatusText(): string {
    if (this.profileData?.isActive && this.profileData?.isEmailVerified)
      return 'Active';
    if (!this.profileData?.isEmailVerified) return 'Pending Verification';
    return 'Inactive';
  }

  getStatusClass(): string {
    if (this.profileData?.isActive && this.profileData?.isEmailVerified)
      return 'active';
    if (!this.profileData?.isEmailVerified) return 'pending';
    return 'inactive';
  }

  editProfile(): void {
    this.router.navigate(['/profile/complete']);
  }

  goToDashboard(): void {
    this.router.navigate(['/resource/dashboard']);
  }

  toggleResumePreview(): void {
    this.showResumePreview = !this.showResumePreview;
    if (this.showResumePreview) {
      setTimeout(() => {
        const el = document.querySelector(
          '.resume-preview-container'
        ) as HTMLElement | null;
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  }

  /* ---------- Download: try server, fallback to client (silent UX) ---------- */
  downloadWithFallback(): void {
    if (this.isDownloading) return;
    this.isDownloading = true;
    this.http
      .get('/api/auth/profile/download', {
        responseType: 'blob',
        observe: 'response',
      })
      .subscribe({
        next: async (resp) => {
          this.isDownloading = false;
          const contentType = resp.headers.get('content-type') || '';
          if (contentType.includes('application/pdf') && resp.body) {
            this.saveBlob(resp.body, this.makeFilename());
            return;
          }

          try {
            const text = await resp.body?.text();
            console.warn(
              'Server returned non-PDF response for download (logged):',
              text
            );
          } catch (e) {
            console.warn(
              'Server returned non-PDF response for download and could not read body.',
              e
            );
          }

          const clientOk = await this.attemptClientPdfGeneration();
        },
        error: async (err) => {
          this.isDownloading = false;
          try {
            if (err && err.error instanceof Blob) {
              const text = await err.error.text();
              console.warn('Server error body for download (logged):', text);
            } else {
              console.warn('Server download error (logged):', err);
            }
          } catch (e) {
            console.warn('Error reading server error body', e);
          }

          const clientOk = await this.attemptClientPdfGeneration();
        },
      });
  }

  private saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  private makeFilename(): string {
    const first =
      this.profileData?.firstName || this.currentUser?.firstName || 'resume';
    const last = this.profileData?.lastName || this.currentUser?.lastName || '';
    return `${first}_${last}`.replace(/\s+/g, '_') + '.pdf';
  }

  private async attemptClientPdfGeneration(): Promise<boolean> {
    try {
      const html2pdfModule = await import('html2pdf.js').catch(() => null);
      if (!html2pdfModule) {
        console.warn(
          'html2pdf.js not installed; client-side generation unavailable.'
        );
        return false;
      }

      const html2pdf = (html2pdfModule.default || html2pdfModule) as any;
      const element =
        (document.querySelector('.preview-card') as HTMLElement) ||
        (document.querySelector('.rd-cv-root') as HTMLElement);
      if (!element) {
        console.warn(
          'Preview element not found for client-side PDF generation.'
        );
        return false;
      }

      const opt = {
        margin: [10, 10, 10, 10],
        filename: this.makeFilename(),
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };

      // @ts-ignore
      html2pdf()
        .set(opt)
        .from(element)
        .save()
        .catch((e: any) => {
          console.error('html2pdf error', e);
        });
      return true;
    } catch (err) {
      console.error('Client-side PDF generation failed:', err);
      return false;
    }
  }
}
