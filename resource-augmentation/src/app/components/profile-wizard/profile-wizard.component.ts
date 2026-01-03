import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile-wizard',
  templateUrl: './profile-wizard.component.html',
  styleUrls: ['./profile-wizard.component.css'],
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
})
export class ProfileWizardComponent implements OnInit {
  // Forms
  personalForm: FormGroup;
  educationForm: FormGroup;
  employmentForm: FormGroup;
  languageForm: FormGroup;
  certificationForm: FormGroup;
  projectForm: FormGroup;

  // UI state
  showEducationForm = false;
  showEmploymentForm = false;
  showLanguageForm = false;
  showCertificationForm = false;
  showProjectForm = false;

  // Data lists
  educationEntries: any[] = [];
  employmentEntries: any[] = [];
  languageEntries: any[] = [];
  certificationEntries: any[] = [];
  projectEntries: any[] = [];

  // Editing ids
  editingEducationId: number | null = null;
  editingEmploymentId: number | null = null;
  editingLanguageId: number | null = null;
  editingCertificationId: number | null = null;
  editingProjectId: number | null = null;

  // Language proficiency levels
  languageLevels = ['BASIC', 'CONVERSATIONAL', 'FLUENT', 'NATIVE'];

  // Expose Array.isArray to template safely
  isArray = Array.isArray;

  // simple loading flag
  isLoading = false;

  // Wizard navigation state
  steps = [
    { key: 'personal', title: 'Personal', description: 'Your basic details' },
    {
      key: 'education',
      title: 'Education',
      description: 'Academic qualifications',
    },
    { key: 'employment', title: 'Employment', description: 'Work experience' },
    {
      key: 'languages',
      title: 'Languages',
      description: 'Languages you speak',
    },
    {
      key: 'certifications',
      title: 'Certifications',
      description: 'Professional certificates',
    },
    { key: 'projects', title: 'Projects', description: 'Notable projects' },
  ];

  currentStepIndex = 0;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // Initialize forms
    this.personalForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      dateOfBirth: [''],
      linkedInProfile: [''],
      gitHubProfile: [''],
      portfolioWebsite: [''],
      address: [''],
      city: [''],
      state: [''],
      country: [''],
      zipCode: [''],
    });

    this.educationForm = this.fb.group({
      degree: ['', Validators.required],
      fieldOfStudy: [''],
      institution: [''],
      startDate: [''],
      endDate: [''],
      grade: [''],
      description: [''],
    });

    this.employmentForm = this.fb.group({
      jobTitle: ['', Validators.required],
      companyName: ['', Validators.required],
      location: [''],
      startDate: [''],
      endDate: [''],
      skills: [''],
      description: [''],
      isCurrentJob: [false],
    });

    this.languageForm = this.fb.group({
      name: ['', Validators.required],
      level: ['BASIC', Validators.required],
    });

    this.certificationForm = this.fb.group({
      title: ['', Validators.required],
      issuingOrganization: [''],
      issueDate: [''],
      expiryDate: [''],
      credentialId: [''],
      link: [''],
      description: [''],
    });

    this.projectForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      technologies: [''], // CSV string
      link: [''],
      startDate: [''],
      endDate: [''],
      isOngoing: [false],
    });
  }

  ngOnInit(): void {
    this.loadProfileEntries();
    this.loadPersonal();
  }

  // ------------------------- Helpers ------------------------- //
  public toYMD(value: any): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }

  private safeArraySkills(skills: any): string[] {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;
    if (typeof skills === 'string') {
      const s = skills.trim();
      if (!s) return [];
      try {
        if (s.startsWith('[')) return JSON.parse(s);
      } catch {
        // fallthrough
      }
      return s
        .split(',')
        .map((x: string) => x.trim())
        .filter(Boolean);
    }
    return [];
  }

  // computed percentage for progress bar
  get completionPercent(): number {
    let completed = 0;
    if (this.personalForm && this.personalForm.valid) completed++;
    if (this.educationEntries && this.educationEntries.length) completed++;
    if (this.employmentEntries && this.employmentEntries.length) completed++;
    // Languages, certs, projects are optional, so don't count them for completion
    return Math.round((completed / 3) * 100); // Based on 3 required sections
  }

  get currentStep(): string {
    return this.steps[this.currentStepIndex]?.key;
  }

  gotoStep(idx: number) {
    if (idx < 0 || idx >= this.steps.length) return;
    this.currentStepIndex = idx;
  }

  nextStep() {
    if (this.currentStepIndex < this.steps.length - 1) this.currentStepIndex++;
  }

  prevStep() {
    if (this.currentStepIndex > 0) this.currentStepIndex--;
  }

  async loadPersonal() {
    this.isLoading = true;
    try {
      const basicRes = await this.authService.getProfile().toPromise();
      const basic = basicRes?.data || {};
      const profileRes = await this.authService
        .getPersonalDetails()
        .toPromise();
      const profile = profileRes?.data || {};

      this.personalForm.patchValue({
        firstName: basic.firstName || '',
        lastName: basic.lastName || '',
        email: basic.email || '',
        phone: profile.phone || '',
        dateOfBirth: profile.dateOfBirth || '',
        linkedInProfile: profile.linkedInProfile || '',
        gitHubProfile: profile.gitHubProfile || '',
        portfolioWebsite: profile.portfolioWebsite || '',
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        country: profile.country || '',
        zipCode: profile.zipCode || '',
      });
    } catch (err) {
      console.error('Failed to load personal data', err);
      if ((err as any)?.status === 401) this.router.navigate(['/auth/login']);
    } finally {
      this.isLoading = false;
    }
  }

  // ------------------------- Loaders ------------------------- //
  loadProfileEntries() {
    this.isLoading = true;

    // EDUCATIONS
    this.authService.getEducations().subscribe({
      next: (res: any) => {
        const payload = res && res.data ? res.data : res;
        this.educationEntries = Array.isArray(payload)
          ? payload.map((e: any) => ({
              Id: e.Id ?? e.id ?? null,
              degree: e.Degree ?? e.degree ?? '',
              fieldOfStudy: e.FieldOfStudy ?? e.fieldOfStudy ?? '',
              institution: e.Institution ?? e.institution ?? '',
              startDate: e.StartDate ?? e.startDate ?? null,
              endDate: e.EndDate ?? e.endDate ?? null,
              grade: e.Grade ?? e.grade ?? '',
              description: e.Description ?? e.description ?? '',
            }))
          : [];
      },
      error: (err) => {
        console.error('Failed to load educations', err);
        if (err && err.status === 401) this.router.navigate(['/auth/login']);
        this.educationEntries = [];
      },
    });

    // EMPLOYMENTS
    this.authService.getEmployments().subscribe({
      next: (res: any) => {
        const payload = res && res.data ? res.data : res;
        this.employmentEntries = Array.isArray(payload)
          ? payload.map((emp: any) => ({
              Id: emp.Id ?? emp.id ?? null,
              jobTitle: emp.JobTitle ?? emp.jobTitle ?? '',
              companyName: emp.CompanyName ?? emp.companyName ?? '',
              location: emp.Location ?? emp.location ?? '',
              startDate: emp.StartDate ?? emp.startDate ?? null,
              endDate: emp.EndDate ?? emp.endDate ?? null,
              description: emp.Description ?? emp.description ?? '',
              skills: this.safeArraySkills(
                emp.Skills ?? emp.skills ?? emp.SkillsJson ?? null
              ),
              isCurrentJob: !!(emp.IsCurrentJob ?? emp.isCurrentJob),
            }))
          : [];
      },
      error: (err) => {
        console.error('Failed to load employments', err);
        if (err && err.status === 401) this.router.navigate(['/auth/login']);
        this.employmentEntries = [];
      },
    });

    // LANGUAGES
    this.authService.getLanguages().subscribe({
      next: (res: any) => {
        const payload = res && res.data ? res.data : res;
        this.languageEntries = Array.isArray(payload)
          ? payload.map((lang: any) => ({
              Id: lang.Id ?? lang.id ?? null,
              name: lang.Name ?? lang.name ?? '',
              level: lang.Level ?? lang.level ?? 'BASIC',
            }))
          : [];
      },
      error: (err) => {
        console.error('Failed to load languages', err);
        this.languageEntries = [];
      },
    });

    // CERTIFICATIONS
    this.authService.getCertifications().subscribe({
      next: (res: any) => {
        const payload = res && res.data ? res.data : res;
        this.certificationEntries = Array.isArray(payload)
          ? payload.map((cert: any) => ({
              Id: cert.Id ?? cert.id ?? null,
              title: cert.Title ?? cert.title ?? '',
              issuingOrganization:
                cert.IssuingOrganization ?? cert.issuingOrganization ?? '',
              issueDate: cert.IssueDate ?? cert.issueDate ?? null,
              expiryDate: cert.ExpiryDate ?? cert.expiryDate ?? null,
              credentialId: cert.CredentialId ?? cert.credentialId ?? '',
              link: cert.Link ?? cert.link ?? '',
              description: cert.Description ?? cert.description ?? '',
            }))
          : [];
      },
      error: (err) => {
        console.error('Failed to load certifications', err);
        this.certificationEntries = [];
      },
    });

    // PROJECTS
    this.authService.getProjects().subscribe({
      next: (res: any) => {
        const payload = res && res.data ? res.data : res;
        this.projectEntries = Array.isArray(payload)
          ? payload.map((proj: any) => ({
              Id: proj.Id ?? proj.id ?? null,
              title: proj.Title ?? proj.title ?? '',
              description: proj.Description ?? proj.description ?? '',
              technologies: this.safeArraySkills(
                proj.Technologies ?? proj.technologies ?? null
              ),
              link: proj.Link ?? proj.link ?? '',
              startDate: proj.StartDate ?? proj.startDate ?? null,
              endDate: proj.EndDate ?? proj.endDate ?? null,
              isOngoing: !!(proj.IsOngoing ?? proj.isOngoing),
            }))
          : [];
      },
      error: (err) => {
        console.error('Failed to load projects', err);
        this.projectEntries = [];
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  // ------------------------- Personal ------------------------- //
  savePersonal() {
    if (this.personalForm.invalid) {
      this.personalForm.markAllAsTouched();
      return;
    }

    const payload = this.personalForm.value;
    this.isLoading = true;
    if (this.authService.savePersonal) {
      this.authService.savePersonal(payload).subscribe({
        next: () => {
          this.isLoading = false;
          this.loadPersonal();
        },
        error: (err) => {
          console.error('Failed to save personal', err);
          this.isLoading = false;
        },
      });
    } else {
      console.warn('authService.savePersonal not implemented');
      this.isLoading = false;
    }
  }

  // ------------------------- Education CRUD ------------------------- //
  startAddEducation() {
    this.editingEducationId = null;
    this.showEducationForm = true;
    this.educationForm.reset();
  }

  editEducation(index: number) {
    const e = this.educationEntries?.[index];
    if (!e) return;
    this.editingEducationId = e.Id ?? null;
    this.showEducationForm = true;
    Promise.resolve().then(() => {
      this.educationForm.patchValue({
        degree: e.degree ?? '',
        fieldOfStudy: e.fieldOfStudy ?? '',
        institution: e.institution ?? '',
        startDate: this.toYMD(e.startDate),
        endDate: this.toYMD(e.endDate),
        grade: e.grade ?? '',
        description: e.description ?? '',
      });
    });
  }

  cancelEducationEdit() {
    this.showEducationForm = false;
    this.editingEducationId = null;
    this.educationForm.reset();
  }

  saveEducation() {
    const raw = this.educationForm.value;
    const single: any = {
      degree: raw.degree,
      fieldOfStudy: raw.fieldOfStudy,
      institution: raw.institution,
      startDate: raw.startDate || null,
      endDate: raw.endDate || null,
      grade: raw.grade || null,
      description: raw.description || null,
    };

    const payloadArray = [single];
    if (this.authService.saveEducations) {
      this.authService.saveEducations(payloadArray).subscribe({
        next: () => {
          this.loadProfileEntries();
          this.showEducationForm = false;
          this.editingEducationId = null;
        },
        error: (err) => console.error('Save educations error:', err),
      });
    }
  }

  deleteEducation(id: number) {
    if (!id) return;
    if (this.authService.deleteEducation) {
      this.authService.deleteEducation(id).subscribe({
        next: () => this.loadProfileEntries(),
        error: (err) => console.error('Failed to delete education', err),
      });
    }
  }

  // ------------------------- Employment CRUD ------------------------- //
  startAddEmployment() {
    this.editingEmploymentId = null;
    this.showEmploymentForm = true;
    this.employmentForm.reset();
  }

  editEmployment(index: number) {
    const emp = this.employmentEntries?.[index];
    if (!emp) return;
    this.editingEmploymentId = emp.Id ?? null;
    this.showEmploymentForm = true;
    Promise.resolve().then(() => {
      this.employmentForm.patchValue({
        jobTitle: emp.jobTitle ?? '',
        companyName: emp.companyName ?? '',
        location: emp.location ?? '',
        startDate: this.toYMD(emp.startDate),
        endDate: this.toYMD(emp.endDate),
        skills: Array.isArray(emp.skills)
          ? emp.skills.join(', ')
          : emp.skills ?? '',
        description: emp.description ?? '',
        isCurrentJob: !!emp.isCurrentJob,
      });
    });
  }

  cancelEmploymentEdit() {
    this.showEmploymentForm = false;
    this.editingEmploymentId = null;
    this.employmentForm.reset();
  }

  saveEmployment() {
    const raw = this.employmentForm.value;
    const skillsArray = raw.skills
      ? raw.skills
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [];

    const single: any = {
      jobTitle: raw.jobTitle,
      companyName: raw.companyName,
      location: raw.location || null,
      startDate: raw.startDate || null,
      endDate: raw.endDate || null,
      description: raw.description || null,
      skills: skillsArray.length ? skillsArray : null,
      isCurrentJob: !!raw.isCurrentJob,
    };

    const payloadArray = [single];
    if (this.authService.saveEmployments) {
      this.authService.saveEmployments(payloadArray).subscribe({
        next: () => {
          this.loadProfileEntries();
          this.showEmploymentForm = false;
          this.editingEmploymentId = null;
        },
        error: (err) => console.error('Save employments error:', err),
      });
    }
  }

  deleteEmployment(id: number) {
    if (!id) return;
    if (this.authService.deleteEmployment) {
      this.authService.deleteEmployment(id).subscribe({
        next: () => this.loadProfileEntries(),
        error: (err) => console.error('Failed to delete employment', err),
      });
    }
  }

  // ------------------------- Language CRUD ------------------------- //
  startAddLanguage() {
    this.editingLanguageId = null;
    this.showLanguageForm = true;
    this.languageForm.reset({ level: 'BASIC' });
  }

  editLanguage(index: number) {
    const lang = this.languageEntries?.[index];
    if (!lang) return;
    this.editingLanguageId = lang.Id ?? null;
    this.showLanguageForm = true;
    Promise.resolve().then(() => {
      this.languageForm.patchValue({
        name: lang.name ?? '',
        level: lang.level ?? 'BASIC',
      });
    });
  }

  cancelLanguageEdit() {
    this.showLanguageForm = false;
    this.editingLanguageId = null;
    this.languageForm.reset();
  }

  saveLanguage() {
    if (this.languageForm.invalid) {
      this.languageForm.markAllAsTouched();
      return;
    }

    const raw = this.languageForm.value;
    const single: any = {
      name: raw.name,
      level: raw.level,
    };

    // Build the full array to send to backend
    let payloadArray: any[] = [];

    if (this.editingLanguageId) {
      // Editing: replace the edited item in the array
      payloadArray = this.languageEntries.map((lang) =>
        lang.Id === this.editingLanguageId
          ? single
          : {
              name: lang.name,
              level: lang.level,
            }
      );
    } else {
      // Adding: append new item to existing array
      payloadArray = [
        ...this.languageEntries.map((lang) => ({
          name: lang.name,
          level: lang.level,
        })),
        single,
      ];
    }

    if (this.authService.saveLanguages) {
      this.authService.saveLanguages(payloadArray).subscribe({
        next: () => {
          this.loadProfileEntries();
          this.showLanguageForm = false;
          this.editingLanguageId = null;
        },
        error: (err) => {
          console.error('Save languages error:', err);
          alert('Failed to save language. Please try again.');
        },
      });
    }
  }

  deleteLanguage(id: number) {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this language?')) return;

    if (this.authService.deleteLanguage) {
      this.authService.deleteLanguage(id).subscribe({
        next: () => this.loadProfileEntries(),
        error: (err) => console.error('Failed to delete language', err),
      });
    }
  }

  // ------------------------- Certification CRUD ------------------------- //
  startAddCertification() {
    this.editingCertificationId = null;
    this.showCertificationForm = true;
    this.certificationForm.reset();
  }

  editCertification(index: number) {
    const cert = this.certificationEntries?.[index];
    if (!cert) return;
    this.editingCertificationId = cert.Id ?? null;
    this.showCertificationForm = true;
    Promise.resolve().then(() => {
      this.certificationForm.patchValue({
        title: cert.title ?? '',
        issuingOrganization: cert.issuingOrganization ?? '',
        issueDate: this.toYMD(cert.issueDate),
        expiryDate: this.toYMD(cert.expiryDate),
        credentialId: cert.credentialId ?? '',
        link: cert.link ?? '',
        description: cert.description ?? '',
      });
    });
  }

  cancelCertificationEdit() {
    this.showCertificationForm = false;
    this.editingCertificationId = null;
    this.certificationForm.reset();
  }

  saveCertification() {
    if (this.certificationForm.invalid) {
      this.certificationForm.markAllAsTouched();
      return;
    }

    const raw = this.certificationForm.value;
    const single: any = {
      title: raw.title,
      issuingOrganization: raw.issuingOrganization || null,
      issueDate: raw.issueDate || null,
      expiryDate: raw.expiryDate || null,
      credentialId: raw.credentialId || null,
      link: raw.link || null,
      description: raw.description || null,
    };

    // Build the full array to send to backend
    let payloadArray: any[] = [];

    if (this.editingCertificationId) {
      // Editing: replace the edited item
      payloadArray = this.certificationEntries.map((cert) =>
        cert.Id === this.editingCertificationId
          ? single
          : {
              title: cert.title,
              issuingOrganization: cert.issuingOrganization,
              issueDate: cert.issueDate,
              expiryDate: cert.expiryDate,
              credentialId: cert.credentialId,
              link: cert.link,
              description: cert.description,
            }
      );
    } else {
      // Adding: append new item
      payloadArray = [
        ...this.certificationEntries.map((cert) => ({
          title: cert.title,
          issuingOrganization: cert.issuingOrganization,
          issueDate: cert.issueDate,
          expiryDate: cert.expiryDate,
          credentialId: cert.credentialId,
          link: cert.link,
          description: cert.description,
        })),
        single,
      ];
    }

    if (this.authService.saveCertifications) {
      this.authService.saveCertifications(payloadArray).subscribe({
        next: () => {
          this.loadProfileEntries();
          this.showCertificationForm = false;
          this.editingCertificationId = null;
        },
        error: (err) => {
          console.error('Save certifications error:', err);
          alert('Failed to save certification. Please try again.');
        },
      });
    }
  }

  deleteCertification(id: number) {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this certification?')) return;

    if (this.authService.deleteCertification) {
      this.authService.deleteCertification(id).subscribe({
        next: () => this.loadProfileEntries(),
        error: (err) => console.error('Failed to delete certification', err),
      });
    }
  }

  // ------------------------- Project CRUD ------------------------- //
  startAddProject() {
    this.editingProjectId = null;
    this.showProjectForm = true;
    this.projectForm.reset({ isOngoing: false });
  }

  editProject(index: number) {
    const proj = this.projectEntries?.[index];
    if (!proj) return;
    this.editingProjectId = proj.Id ?? null;
    this.showProjectForm = true;
    Promise.resolve().then(() => {
      this.projectForm.patchValue({
        title: proj.title ?? '',
        description: proj.description ?? '',
        technologies: Array.isArray(proj.technologies)
          ? proj.technologies.join(', ')
          : proj.technologies ?? '',
        link: proj.link ?? '',
        startDate: this.toYMD(proj.startDate),
        endDate: this.toYMD(proj.endDate),
        isOngoing: !!proj.isOngoing,
      });
    });
  }

  cancelProjectEdit() {
    this.showProjectForm = false;
    this.editingProjectId = null;
    this.projectForm.reset();
  }

  saveProject() {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    const raw = this.projectForm.value;
    const techArray = raw.technologies
      ? raw.technologies
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [];

    const single: any = {
      title: raw.title,
      description: raw.description || null,
      technologies: techArray.length ? techArray : null,
      link: raw.link || null,
      startDate: raw.startDate || null,
      endDate: raw.endDate || null,
      isOngoing: !!raw.isOngoing,
    };

    // Build the full array to send to backend
    let payloadArray: any[] = [];

    if (this.editingProjectId) {
      // Editing: replace the edited item
      payloadArray = this.projectEntries.map((proj) =>
        proj.Id === this.editingProjectId
          ? single
          : {
              title: proj.title,
              description: proj.description,
              technologies: proj.technologies,
              link: proj.link,
              startDate: proj.startDate,
              endDate: proj.endDate,
              isOngoing: proj.isOngoing,
            }
      );
    } else {
      // Adding: append new item
      payloadArray = [
        ...this.projectEntries.map((proj) => ({
          title: proj.title,
          description: proj.description,
          technologies: proj.technologies,
          link: proj.link,
          startDate: proj.startDate,
          endDate: proj.endDate,
          isOngoing: proj.isOngoing,
        })),
        single,
      ];
    }

    if (this.authService.saveProjects) {
      this.authService.saveProjects(payloadArray).subscribe({
        next: () => {
          this.loadProfileEntries();
          this.showProjectForm = false;
          this.editingProjectId = null;
        },
        error: (err) => {
          console.error('Save projects error:', err);
          alert('Failed to save project. Please try again.');
        },
      });
    }
  }

  deleteProject(id: number) {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this project?')) return;

    if (this.authService.deleteProject) {
      this.authService.deleteProject(id).subscribe({
        next: () => this.loadProfileEntries(),
        error: (err) => console.error('Failed to delete project', err),
      });
    }
  }
}
