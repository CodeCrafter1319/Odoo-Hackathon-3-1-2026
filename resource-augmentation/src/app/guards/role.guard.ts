import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../core/user.model';
import { AuthService } from '../services/auth.service';
import { inject } from '@angular/core';

export const roleGuard =
  (allowedRoles: Role[]): CanActivateFn =>
  (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isAuthenticated() && authService.hasRole(allowedRoles)) {
      return true;
    }
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      switch (currentUser.role) {
        case Role.ADMIN:
          router.navigate(['/admin/dashboard']);
          break;
        case Role.COMPANY:
          router.navigate(['/company/dashboard']);
          break;
        case Role.RESOURCE:
          router.navigate(['/resource/dashboard']);
          break;
        default:
          router.navigate(['/unauthorized']);
      }
    } else {
      router.navigate(['/auth/login']);
    }
    return false;
  };
