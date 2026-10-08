import type { ComponentFixture } from '@angular/core/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { KnowledgeSpaceContextService } from '#core/services/knowledge-space-context.service';
import type { NodeSearchResult } from '#core/services/node-search.service';
import { NodeSearchService } from '#core/services/node-search.service';
import { RecentActivityService } from '#core/services/recent-activity.service';

import { SearchOverlay } from './components/search-overlay/search-overlay';
import { SearchField } from './search-field.component';
describe('SearchField', () => {
  // let component: SearchField;
  let fixture: ComponentFixture<SearchField>;

  let searchNodes: jasmine.Spy;

  beforeEach(async () => {
    searchNodes = jasmine.createSpy('searchNodes').and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [SearchField],
      providers: [
        {
          provide: NodeSearchService,
          useValue: { searchNodes },
        },
        {
          provide: RecentActivityService,
          useValue: {
            lastViewedNodes$: of([{ id: 'recent-1', title: 'Recent Node' }]),
            recentSearches$: of(['previous search']),
            addRecentSearch: jasmine.createSpy('addRecentSearch'),
            addLastViewedNode: jasmine.createSpy('addLastViewedNode'),
          },
        },
        {
          provide: KnowledgeSpaceContextService,
          useValue: {
            getCurrentSpaceSlug: () => 'default',
          },
        },
        {
          provide: Router,
          useValue: {
            navigate: jasmine.createSpy('navigate'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchField);
    // component = fixture.componentInstance;
  });

  it('displays the overlay when the search input receives focus and then allow to close it', fakeAsync(() => {
    // If a component template subscribes to an observable with timers, call fixture.detectChanges() inside the fakeAsync test so tick() controls those timers.
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input[type=search]') as HTMLInputElement;

    input.dispatchEvent(new Event('focus'));
    tick(800);
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('app-search-overlay');

    expect(overlay).not.toBeNull();

    overlay.dispatchEvent(new Event('closeOverlay'));
  }));

  it('calls debounced searchNodes with trimmed value then call addRecentSearch and passes all properties to SearchOverlay', fakeAsync(() => {
    // 1. Return a Subject so the network call stays pending
    const searchSubject$ = new Subject<NodeSearchResult[]>();
    searchNodes.and.returnValue(searchSubject$);

    // automatic change detection is completely turned off in the test environment
    // this forces Angular to check the component's state and re-render the HTML template.
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[type=search]') as HTMLInputElement;

    input.dispatchEvent(new Event('focus'));
    input.value = '  test this red fox   ';
    input.dispatchEvent(new Event('input'));

    expect(searchNodes).not.toHaveBeenCalled();
    tick(800);
    // input was trimmed
    expect(searchNodes).toHaveBeenCalledOnceWith('test this red fox');

    fixture.detectChanges();

    // spinner is displayed
    const spinner = fixture.nativeElement.querySelector('[role="status"]');
    expect(spinner).not.toBeNull();
    expect(spinner.getAttribute('aria-label')).toBe('Searching');

    // 3. Emit API response to complete the search
    const mockResults: NodeSearchResult[] = [{ id: '1', title: 'test this red fox' }];
    searchSubject$.next(mockResults);
    fixture.detectChanges();

    // --- NOW THE SPINNER IS GONE ---
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();

    // check that recentSearches service was called with the trimmed value
    const recentActivityService = TestBed.inject(RecentActivityService);
    expect(recentActivityService.addRecentSearch).toHaveBeenCalledOnceWith('test this red fox');

    // use debugElement - Raw HTML elements do not have TypeScript @Input() properties like .showRecentSearches!
    const overlayDebugEl = fixture.debugElement.query(By.directive(SearchOverlay));
    expect(overlayDebugEl).not.toBeNull();

    const overlayInstance = overlayDebugEl.componentInstance as SearchOverlay;
    expect(overlayInstance.searchResults).toEqual(mockResults);
    expect(overlayInstance.recentSearches).toEqual(['previous search']);
    expect(overlayInstance.lastViewedNodes).toEqual([{ id: 'recent-1', title: 'Recent Node' }]);
    expect(overlayInstance.showRecentSearches).toBeFalse();
  }));

  it('displays error state after retries fail', fakeAsync(() => {
    // 1. Mock API to throw an error
    searchNodes.and.returnValue(throwError(() => new Error('Search failed')));

    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[type=search]') as HTMLInputElement;

    input.value = 'invalid query';
    input.dispatchEvent(new Event('input'));

    // 2. Advance time: 800ms debounce + (2 retries * 1000ms delay) = 2800ms
    tick(2800);
    fixture.detectChanges();

    // 3. Verify searchNodes service call
    expect(searchNodes).toHaveBeenCalledOnceWith('invalid query');

    // 4. Verify error icon container in DOM
    const errorContainer = fixture.nativeElement.querySelector(
      '[aria-label="An error occurred while searching."]',
    );
    expect(errorContainer).not.toBeNull();
  }));
});
