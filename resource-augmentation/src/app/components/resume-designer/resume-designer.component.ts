// resume-designer.component.ts
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-resume-designer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './resume-designer.component.html',
  styleUrls: ['./resume-designer.component.css'],
})
export class ResumeDesignerComponent implements OnChanges {
  @Input() profile: any = {};
  @Input() templateKey: 'twoColumn' | 'classic' | 'modern' = 'twoColumn';

  // default/fallback certs if none provided
  defaultCerts = [
    { title: 'Angular - The Complete Guide (2025 Edition)', link: 'https://www.udemy.com' },
    { title: 'AWS Cloud Practitioner', link: 'https://www.udemy.com' }
  ];

  defaultSummary = `Frontend developer with hands-on experience building responsive, dynamic web applications using Angular and Node.js.`;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['profile']) {
      // small normalization to make template access easier
      this.normalizeProfile();
    }
    // we keep templateKey to allow future template switching
  }

  normalizeProfile() {
    if (!this.profile) return;
    // ensure arrays exist
    this.profile.educations = this.profile.educations || [];
    this.profile.employments = this.profile.employments || this.profile.jobs || [];
    this.profile.projects = this.profile.projects || [];
    this.profile.certifications = this.profile.certifications || [];
    this.profile.languages = this.profile.languages || [];
    // attempt to parse some common shapes (if profile comes from older API)
    if (this.profile.skills && typeof this.profile.skills === 'string') {
      try {
        this.profile.skills = JSON.parse(this.profile.skills);
      } catch { /* ignore */ }
    }
  }

  fmtDate(d: any) {
    if (!d) return '';
    // Accept Date, ISO string, or yyyy-mm-dd
    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt.getTime())) return d;
    const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short' };
    return new Intl.DateTimeFormat('en-US', opts).format(dt);
  }
}
