// app.config.ts
import { ApplicationConfig, provideZoneChangeDetection, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import {
  provideClientHydration,
  withEventReplay,
  withNoHttpTransferCache
} from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';
import {provideAnimations}from '@angular/platform-browser/animations';
import { provideServiceWorker } from '@angular/service-worker'
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // Add withNoHttpTransferCache to prevent hydration conflicts
    provideClientHydration(withEventReplay(), withNoHttpTransferCache()),
    provideHttpClient(withInterceptors([authInterceptor]),withFetch()),
    provideAnimations(), provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          }),
  ],
};