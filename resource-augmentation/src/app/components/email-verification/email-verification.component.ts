import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-email-verification',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './email-verification.component.html',
  styleUrl: './email-verification.component.css',
})
export class EmailVerificationComponent implements OnInit {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  verificationToken: string = '';
  currentStep:
    | 'verifying'
    | 'verified'
    | 'set-password'
    | 'complete'
    | 'error' = 'verifying';
  userInfo: any = null;
  errorMessage = '';
  successMessage = '';
  isLoading = false;
  private verificationAttempted = false;
  // Password form
  passwordForm = {
    password: '',
    confirmPassword: '',
  };
  hidePassword = true;
  hideConfirmPassword = true;

  ngOnInit(): void {
    this.verificationToken = this.route.snapshot.params['token'];
    console.log('🔍 Component initialized with token:', this.verificationToken);

    // **PREVENT MULTIPLE CALLS**
    if (this.verificationAttempted) {
      console.log('🔍 Verification already attempted, skipping');
      return;
    }

    // Safe sessionStorage access
    if (isPlatformBrowser(this.platformId)) {
      const verificationStatus = sessionStorage.getItem(
        `verification_${this.verificationToken}`
      );
      if (verificationStatus === 'success') {
        console.log('🔍 Found cached successful verification');
        this.currentStep = 'set-password';
        return;
      }
    }

    if (this.verificationToken) {
      this.verifyEmail();
    } else {
      this.currentStep = 'error';
      this.errorMessage = 'Invalid verification link.';
    }
  }

  private verifyEmail(): void {
  if (this.verificationAttempted) {
    console.log('🔍 Verification already attempted, skipping');
    return;
  }

  this.verificationAttempted = true;
  this.isLoading = true;
  this.currentStep = 'verifying';
  
  this.authService.verifyEmail(this.verificationToken).subscribe({
    next: (response) => {
      console.log('🔍 Full verification response:', response);
      
      if (response.success && response.data) {
        // **FIX: Assign data to userInfo FIRST**
        this.userInfo = response.data;
        
        console.log('🔍 Mapped userInfo:', this.userInfo);
        
        // Store success in sessionStorage
        if (isPlatformBrowser(this.platformId)) {
          sessionStorage.setItem(`verification_${this.verificationToken}`, 'success');
          sessionStorage.setItem(`user_info_${this.verificationToken}`, JSON.stringify(this.userInfo));
        }
        
        // Now check if userId exists (should always be true)
        if (!this.userInfo.userId && !this.userInfo.id) {
          console.error('❌ No user ID found in response data:', this.userInfo);
          this.errorMessage = 'User information is incomplete. Please try verification again.';
          return;
        }

        this.successMessage = response.message;
        this.currentStep = 'set-password';
      } else {
        this.handleVerificationError(response);
      }
      this.isLoading = false;
    },
    error: (error) => {
      // Check for cached user info before showing error
      if (isPlatformBrowser(this.platformId)) {
        const cachedUserInfo = sessionStorage.getItem(`user_info_${this.verificationToken}`);
        if (cachedUserInfo) {
          console.log('🔍 Using cached user info for password setup');
          this.userInfo = JSON.parse(cachedUserInfo);
          this.currentStep = 'set-password';
          this.successMessage = 'Email already verified. Please set your password.';
          this.isLoading = false;
          return;
        }
      }
      
      this.handleVerificationError(error);
      this.isLoading = false;
    }
  });
}


  private handleVerificationError(error: any): void {
    console.error('❌ Email verification error:', error);

    let errorMessage: string = '';

    if (error && typeof error === 'object') {
      if (error.error && typeof error.error === 'string') {
        errorMessage = error.error;
      } else if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else {
        errorMessage = 'Email verification failed';
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      errorMessage = 'Email verification failed';
    }

    console.log('🔍 Processed error message:', errorMessage);

    // **ENHANCED: Handle "already used" case better**
    if (
      errorMessage.includes('already been used') ||
      errorMessage.includes('expired')
    ) {
      this.currentStep = 'error';
      this.errorMessage = `
        This verification link has already been used or has expired.
        
        If you haven't completed setting up your password yet, please contact your administrator to resend a new verification email.
        
        If you've already set up your password, you can proceed to login.
      `;
    } else {
      this.currentStep = 'error';
      this.errorMessage = errorMessage || 'Email verification failed.';
    }
  }

  onSetPassword(): void {
    if (!this.isPasswordFormValid()) {
      this.errorMessage = 'Please fill in all fields correctly.';
      return;
    }

    if (this.passwordForm.password !== this.passwordForm.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    const userId = this.userInfo?.userId || this.userInfo?.id;

    if (!userId) {
      this.errorMessage =
        'User information is missing. Please try the verification link again.';
      console.error('❌ No user ID available:', this.userInfo);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const passwordData = {
      userId: userId,
      password: this.passwordForm.password,
    };

    console.log('🔍 Setting password with data:', passwordData);

    this.authService.setPassword(passwordData).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('✅ Password set successfully');
          this.currentStep = 'complete';
          this.successMessage =
            'Password set successfully! Redirecting to profile setup...';
          this.router.navigate(['/login']);
        } else {
          this.errorMessage = response.message || 'Failed to set password.';
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Password setting error:', error);
        let errorMsg = 'Failed to set password.';
        if (error && error.error && error.error.message) {
          errorMsg = error.error.message;
        } else if (error && typeof error === 'string') {
          errorMsg = error;
        }
        this.errorMessage = errorMsg;
        this.isLoading = false;
      },
    });
  }

  isPasswordFormValid(): boolean {
    return !!(
      this.passwordForm.password.length >= 6 &&
      this.passwordForm.confirmPassword.length >= 6 &&
      this.passwordForm.password === this.passwordForm.confirmPassword
    );
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.hidePassword = !this.hidePassword;
    } else {
      this.hideConfirmPassword = !this.hideConfirmPassword;
    }
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  // **NEW: Add resend verification functionality**
  resendVerification(): void {
    // For now, just redirect to admin contact
    this.errorMessage =
      'Please contact your administrator to resend a new verification email.';
  }
}
