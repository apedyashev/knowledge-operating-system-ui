import { InjectionToken } from '@angular/core';

// Central place for API host configuration so environments can swap hosts without touching services.
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
