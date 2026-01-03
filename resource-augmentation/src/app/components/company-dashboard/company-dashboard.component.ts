import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { User } from '../../core/user.model';
import { CommonEngine } from '@angular/ssr/node';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-company-dashboard',
  imports: [CommonModule],
  templateUrl: './company-dashboard.component.html',
  styleUrl: './company-dashboard.component.css',
})
export class CompanyDashboardComponent implements OnInit {
  currentUser: User | null = null;
  constructor(private authService: AuthService) {}
  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
  }
}
