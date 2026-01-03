// guards/auth.guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take, switchMap } from 'rxjs/operators';
import { from } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Ensure auth service is initialized before checking authentication
  return from(authService.ensureInitialized()).pipe(
    switchMap(() => authService.isLoggedIn$),
    take(1),
    map((isLoggedIn) => {
      const isAuthenticated = isLoggedIn || authService.isAuthenticated();

      if (isAuthenticated) {
        return true;
      } else {
        router.navigate(['/auth/login'], {
          queryParams: { returnUrl: state.url },
        });
        return false;
      }
    })
  );
};
