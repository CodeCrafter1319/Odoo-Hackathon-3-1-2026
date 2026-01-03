import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  // registerForm = {
  //   firstName: '',
  //   lastName: '',
  //   email: '',
  //   phone: '',
  //   userType: '',
  //   roleId: 0,
  //   password: '',
  // };
  
  // roles: Role[] = [];
  // filteredRoles: Role[] = [];
  // hidePassword = true;
  // isLoading = false;
  // errorMessage = '';
  // successMessage = '';
  // constructor(private authService: AuthService) {}
  // ngOnInit(): void {
  //   this.loadRoles();
  // }

  // loadRoles(): void {
  //   // Hardcoded roles based on your backend
  //   this.roles = [
  //     {
  //       id: 1,
  //       name: 'Super Admin',
  //       description: 'Company A - Top level administrator',
  //       roleType: UserType.ADMIN,
  //     },
  //     {
  //       id: 2,
  //       name: 'Project Manager',
  //       description: 'Company A - Project management role',
  //       roleType: UserType.ADMIN,
  //     },
  //     {
  //       id: 3,
  //       name: 'Company Owner',
  //       description: 'External company owner/representative',
  //       roleType: UserType.COMPANY,
  //     },
  //     {
  //       id: 4,
  //       name: 'Company HR',
  //       description: 'External company HR representative',
  //       roleType: UserType.COMPANY,
  //     },
  //     {
  //       id: 5,
  //       name: 'Senior Developer',
  //       description: 'Senior level resource',
  //       roleType: UserType.RESOURCE,
  //     },
  //     {
  //       id: 6,
  //       name: 'Junior Developer',
  //       description: 'Junior level resource',
  //       roleType: UserType.RESOURCE,
  //     },
  //     {
  //       id: 7,
  //       name: 'Tech Lead',
  //       description: 'Technical lead resource',
  //       roleType: UserType.RESOURCE,
  //     },
  //   ];
  // }

  // onUserTypeChange(): void {
  //   const userType = this.registerForm.userType as UserType;
  //   this.filteredRoles = this.roles.filter(
  //     (role) => role.roleType === userType
  //   );
  //   this.registerForm.roleId = 0; // Reset role selection
  // }

  // onRegister(): void {
  //   if (this.isFormValid()) {
  //     this.isLoading = true;
  //     this.errorMessage = '';
  //     this.successMessage = '';

  //     const registerData: RegisterRequest = {
  //       firstName: this.registerForm.firstName.trim(),
  //       lastName: this.registerForm.lastName.trim(),
  //       email: this.registerForm.email.trim().toLowerCase(),
  //       phone: this.registerForm.phone.trim(),
  //       userType: this.registerForm.userType as UserType,
  //       roleId: this.registerForm.roleId,
  //       password: this.registerForm.password,
  //     };

  //     this.authService.register(registerData).subscribe({
  //       next: (response) => {
  //         this.successMessage =
  //           'Registration successful! You can now login with your credentials.';
  //         this.resetForm();
  //         // Redirect to login after 3 seconds
  //         setTimeout(() => {
  //           window.location.href = '/auth/login';
  //         }, 3000);
  //       },
  //       error: (error) => {
  //         this.isLoading = false;
  //         this.errorMessage = error || 'Registration failed. Please try again.';
  //       },
  //       complete: () => {
  //         this.isLoading = false;
  //       },
  //     });
  //   }
  // }

  // togglePasswordVisibility(): void {
  //   this.hidePassword = !this.hidePassword;
  // }

  // private isFormValid(): boolean {
  //   return (
  //     this.registerForm.firstName.trim() !== '' &&
  //     this.registerForm.lastName.trim() !== '' &&
  //     this.registerForm.email.trim() !== '' &&
  //     this.registerForm.phone.trim() !== '' &&
  //     this.registerForm.userType !== '' &&
  //     this.registerForm.roleId > 0 &&
  //     this.registerForm.password.length >= 6 &&
  //     this.isValidEmail(this.registerForm.email) &&
  //     this.isValidPhone(this.registerForm.phone)
  //   );
  // }

  // private isValidEmail(email: string): boolean {
  //   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  //   return emailRegex.test(email);
  // }

  // private isValidPhone(phone: string): boolean {
  //   const phoneRegex = /^\d{10}$/;
  //   return phoneRegex.test(phone);
  // }

  // private resetForm(): void {
  //   this.registerForm = {
  //     firstName: '',
  //     lastName: '',
  //     email: '',
  //     phone: '',
  //     userType: '',
  //     roleId: 0,
  //     password: '',
  //   };
  //   this.filteredRoles = [];
  // }

  // // Validation helper methods
  // isFirstNameInvalid(): boolean {
  //   return (
  //     this.registerForm.firstName !== '' &&
  //     this.registerForm.firstName.trim().length < 2
  //   );
  // }

  // isLastNameInvalid(): boolean {
  //   return (
  //     this.registerForm.lastName !== '' &&
  //     this.registerForm.lastName.trim().length < 2
  //   );
  // }

  // isEmailInvalid(): boolean {
  //   return (
  //     this.registerForm.email !== '' &&
  //     !this.isValidEmail(this.registerForm.email)
  //   );
  // }

  // isPhoneInvalid(): boolean {
  //   return (
  //     this.registerForm.phone !== '' &&
  //     !this.isValidPhone(this.registerForm.phone)
  //   );
  // }

  // isPasswordInvalid(): boolean {
  //   return (
  //     this.registerForm.password !== '' && this.registerForm.password.length < 6
  //   );
  // }
}
