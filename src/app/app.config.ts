import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { API_BASE_URL } from './core/config/api-base-url.token';
import { routes } from './app.routes';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(),
    // Use the environment value so the same Angular app can run locally with a proxy or on Vercel with a real API URL.
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
    provideRouter(routes)
  ]
};
