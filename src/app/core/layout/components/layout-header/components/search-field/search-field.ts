import { AsyncPipe } from '@angular/common';
import type { ElementRef } from '@angular/core';
import { Component, EventEmitter, HostListener, Output, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  switchMap,
  tap,
} from 'rxjs/operators';

import { KnowledgeSpaceContextService } from '#core/services/knowledge-space-context.service';
import type { NodeSearchResult } from '#core/services/node-search.service';
import { NodeSearchService } from '#core/services/node-search.service';
import { RecentActivityService } from '#core/services/recent-activity.service';

import { SearchOverlay } from './components/search-overlay/search-overlay';

@Component({
  selector: 'app-search-field',
  standalone: true,
  imports: [AsyncPipe, SearchOverlay],
  templateUrl: './search-field.html',
})
export class SearchField {
  private readonly nodeSearchService = inject(NodeSearchService);
  private readonly recentActivityService = inject(RecentActivityService);
  private readonly router = inject(Router);
  private readonly knowledgeSpaceContextService = inject(KnowledgeSpaceContextService);

  @Output() searchChange = new EventEmitter<string>();
  // We keep a direct ref so keyboard shortcuts can focus the field from anywhere in the app shell.
  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

  private readonly searchTerm$ = new EventEmitter<string>();
  shouldShowOverlay = false;
  activeResultIndex = -1;
  searchTerm = '';
  lastViewedNodes$ = this.recentActivityService.lastViewedNodes$;
  recentSearches$ = this.recentActivityService.recentSearches$;

  searchResults: NodeSearchResult[] = [];

  readonly searchResults$ = this.searchTerm$.pipe(
    map((term) => term.trim()),
    debounceTime(500),
    // do not emit if current value is the same as previous one
    distinctUntilChanged(),
    // we want to return a new observable
    switchMap((term) => {
      return term === ''
        ? of([])
        : this.nodeSearchService.searchNodes(term).pipe(
            tap(() => {
              this.recentActivityService.addRecentSearch(term);
            }),
            catchError(() => of([])),
          );
    }),
  );

  // We emit text changes so parent containers can decide how search state is stored.
  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value;
    this.searchTerm$.next(this.searchTerm);
  }

  onSearchInputFocus(): void {
    this.showOverlay();
  }

  onCloseOverlay(): void {
    this.shouldShowOverlay = false;
  }

  get backgroundClass(): string {
    return this.shouldShowOverlay ? 'bg-white/70 w-[400px]' : 'bg-surface w-[200px]';
  }

  get showRecentSearches(): boolean {
    return this.shouldShowOverlay && !this.searchTerm;
  }

  showOverlay(): void {
    this.shouldShowOverlay = true;
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    // Cmd/Ctrl + K mirrors command palette behavior: open overlay and place caret in input immediately.
    if ((event.metaKey || event.ctrlKey) && key === 'k') {
      event.preventDefault();
      this.showOverlay();
      this.focusSearchInput();
      return;
    }

    if (key === 'escape') {
      this.shouldShowOverlay = false;
      this.blurSearchInput();
    }
  }

  onSelectResult(selected: string | NodeSearchResult): void {
    if (typeof selected === 'string') {
      // recent serch term selected
      this.searchTerm$.next(selected);
      // this.applyChangedSearchTerm(selected);
    } else if (selected && 'title' in selected) {
      this.router.navigate([
        '/',
        this.knowledgeSpaceContextService.getCurrentSpaceSlug(),
        'node',
        selected.id,
      ]);
      this.shouldShowOverlay = false;
      this.recentActivityService.addLastViewedNode(selected);
    }
  }

  private focusSearchInput(): void {
    // We defer focus until the next frame so Angular can finish rendering overlay/input state first.
    requestAnimationFrame(() => {
      const input = this.searchInputRef?.nativeElement;
      if (!input) {
        return;
      }

      input.focus();
      // Caret at end preserves existing query and avoids replacing highlighted text on repeated shortcut use.
      const caretPosition = input.value.length;
      input.setSelectionRange(caretPosition, caretPosition);
    });
  }

  private blurSearchInput(): void {
    const input = this.searchInputRef?.nativeElement;
    if (!input) {
      return;
    }

    input.blur();
  }
}
