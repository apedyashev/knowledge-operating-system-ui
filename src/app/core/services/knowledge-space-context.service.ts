import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { combineLatest, filter, map, shareReplay, startWith } from 'rxjs';

import {
  KnowledgeSpaceResult,
  KnowledgeSpaceService
} from './knowledge-space.service';

export type KnowledgeSpaceSelectorState = {
  spaces: KnowledgeSpaceResult[];
  selectedSpace: KnowledgeSpaceResult | null;
};

/**
 * Central reactive state for the Knowledge-Space selector.
 *
 * This service connects two independent sources of state:
 * - the list of spaces loaded from the backend
 * - the `:space` slug currently shown in the URL
 *
 * It is needed because the selector is rendered in the global topbar, outside
 * the routed NodePage component. The selector itself should not have to know
 * how routing, URL parsing, API loading, and state synchronization work.
 *
 * Keeping this responsibility here gives the application one shared place that
 * answers: "Which Knowledge Space is currently active?" Components can consume
 * `selectorState$` with the async pipe without manually subscribing.
 */
@Injectable({
  providedIn: 'root'
})
export class KnowledgeSpaceContextService {
  private readonly router = inject(Router);
  private readonly knowledgeSpaceService = inject(KnowledgeSpaceService);

  // The HTTP request is represented as an Observable instead of being subscribed to here.
  // Components can consume this stream with Angular's async pipe.
  readonly spaces$ = this.knowledgeSpaceService.loadKnowledgeSpaces().pipe(
    // Keep the latest API result for all consumers and avoid duplicate HTTP requests.
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // The selector is rendered in the topbar, outside the routed NodePage component.
  // Router.events lets this service observe URL changes from that global position.
  private readonly currentSpaceSlug$ = this.router.events.pipe(
    // Only successful navigations should update the selected space.
    filter((event) => event instanceof NavigationEnd),
    // Emit once immediately so a directly opened URL is handled as well.
    startWith(null),
    map(() => this.readCurrentSpaceSlug())
  );

  // combineLatest waits until both the spaces request and the current URL have emitted.
  // Whenever either one changes, it derives a new selector state for the view.
  readonly selectorState$ = combineLatest({
    spaces: this.spaces$,
    currentSpaceSlug: this.currentSpaceSlug$
  }).pipe(
    // The URL contains the slug, so the slug is the stable value used for matching.
    map(({ spaces, currentSpaceSlug }) => ({
      spaces,
      selectedSpace:
        spaces.find((space) => space.slug === currentSpaceSlug) ?? null
    })),
    // Cache the combined state for the async pipe and future consumers.
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // The component calls this method when the user selects a different space.
  // The resulting NavigationEnd updates selectorState$ automatically.
  selectSpace(space: KnowledgeSpaceResult): void {
    this.router.navigate(['/', space.slug, 'node']);
  }

  private readCurrentSpaceSlug(): string {
    // parseUrl understands Angular's URL structure better than manually splitting strings.
    const primarySegments = this.router.parseUrl(this.router.url).root.children['primary']?.segments;

    return primarySegments?.[0]?.path ?? '';
  }

  getCurrentSpaceSlug(): string {
    return this.readCurrentSpaceSlug();
  }
}
