import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { LoginRequest } from '../../core/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private authService = inject(AuthService);

  loginForm = {
    email: '',
    password: ''
  };

  hidePassword = true;
  isLoading = false;
  errorMessage = '';

  onLogin(): void {
    if (this.isFormValid()) {
      this.isLoading = true;
      this.errorMessage = '';

      const loginData: LoginRequest = {
        email: this.loginForm.email,
        password: this.loginForm.password
      };

      this.authService.login(loginData).subscribe({
        next: (response) => {
          // Success handled by AuthService navigation
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error || 'Login failed. Please try again.';
        },
        complete: () => {
          this.isLoading = false;
        }
      });
    }
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

   isFormValid(): boolean {
    return this.loginForm.email.trim() !== '' &&
           this.loginForm.password.trim() !== '' &&
           this.isValidEmail(this.loginForm.email);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isEmailInvalid(): boolean {
    return this.loginForm.email !== '' && !this.isValidEmail(this.loginForm.email);
  }

  isPasswordInvalid(): boolean {
    return this.loginForm.password !== '' && this.loginForm.password.length < 6;
  }
}
