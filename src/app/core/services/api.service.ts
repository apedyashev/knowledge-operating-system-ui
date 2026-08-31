import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { Observable } from 'rxjs';

import { API_BASE_URL } from '#app/core/config/api-base-url.token';

export interface ApiRequestOptions {
  params?: Record<string, string | number | boolean>;
  spaceScoped?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly router = inject(Router);

  // GET is shared by all read operations. By default, resources belong to the current space.
  get<T>(resource: string, options: ApiRequestOptions = {}): Observable<T> {
    return this.http.get<T>(this.buildUrl(resource, options.spaceScoped ?? true), {
      params: options.params,
    });
  }

  // POST is shared by create operations such as creating a node or a space.
  post<T>(resource: string, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
    return this.http.post<T>(this.buildUrl(resource, options.spaceScoped ?? true), body, {
      params: options.params,
    });
  }

  // PATCH is shared by partial updates, for example saving an existing node.
  patch<T>(resource: string, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
    return this.http.patch<T>(this.buildUrl(resource, options.spaceScoped ?? true), body, {
      params: options.params,
    });
  }

  // DELETE is available here too, so feature services do not need direct HttpClient access.
  delete<T>(resource: string, options: ApiRequestOptions = {}): Observable<T> {
    return this.http.delete<T>(this.buildUrl(resource, options.spaceScoped ?? true), {
      params: options.params,
    });
  }

  private buildUrl(resource: string, spaceScoped: boolean): string {
    const normalizedResource = resource.replace(/^\/+/, '');

    if (!spaceScoped) {
      return `${this.baseUrl}/${normalizedResource}`;
    }

    const currentSpaceSlug = this.readCurrentSpaceSlug();
    if (!currentSpaceSlug) {
      return `${this.baseUrl}/${normalizedResource}`;
    }

    return `${this.baseUrl}/spaces/${encodeURIComponent(currentSpaceSlug)}/${normalizedResource}`;
  }

  private readCurrentSpaceSlug(): string {
    // The global topbar has no useful ActivatedRoute, so read the first primary URL segment.
    const primarySegments = this.router.parseUrl(this.router.url).root.children['primary']
      ?.segments;

    return primarySegments?.[0]?.path ?? '';
  }
}
