import _ from 'lodash';

import { Component, ElementRef, EventEmitter, HostListener, Output, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SearchOverlay } from './components/search-overlay/search-overlay';
import { NodeSearchService, NodeSearchResult } from '#core/services/node-search.service';
import { RecentActivityService } from '#core/services/recent-activity.service';

@Component({
  selector: 'app-search-field',
  standalone: true,
  imports: [SearchOverlay],
  templateUrl: './search-field.html',
})
export class SearchField {
  private readonly nodeSearchService = inject(NodeSearchService);
  private readonly recentActivityService = inject(RecentActivityService);
  private readonly router = inject(Router);
  
  @Output() searchChange = new EventEmitter<string>();
  // We keep a direct ref so keyboard shortcuts can focus the field from anywhere in the app shell.
  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

  shouldShowOverlay = false;
  activeResultIndex = -1;  
  searchTerm = '';
  lastViewedNodes = this.recentActivityService.getLastViewedNodes();
  
  fakeRecentSearches = this.recentActivityService.getRecentSearches();
  searchResults: NodeSearchResult[] = [];
  
  // We emit text changes so parent containers can decide how search state is stored.
  onSearchInput(event: Event): void {
    _.debounce(() => {
      const input = event.target as HTMLInputElement;
      this.applyChangedSearchTerm(input.value);
    }, 500)();
    // const input = event.target as HTMLInputElement;
    // this.applyChangedSearchTerm(input.value);
  }

  debouncedSearch = _.debounce((term: string) => {
    console.log('Performing search for term:', term);
    this.nodeSearchService.searchNodes(term).subscribe((results) => {
      console.log('Search results received:', results);
      this.searchResults = results;
      this.recentActivityService.addRecentSearch(term);
    });
  }, 500);

  onSearchInputFocus(): void {
    this.showOverlay();
  }

  onCloseOverlay(): void {
    this.shouldShowOverlay = false;
  }

  applyChangedSearchTerm(term: string): void {
    this.searchTerm = term;
    this.searchChange.emit(this.searchTerm);
    this.debouncedSearch(this.searchTerm);
    // this.nodeSearchService.searchNodes(this.searchTerm).subscribe((results) => {
    //   this.searchResults = results;
    // });
  }

  get backgroundClass(): string {
    return this.shouldShowOverlay ? 'bg-white/70 w-[400px]': 'bg-surface w-[200px]' ;
  }

  get showRecentSearches(): boolean {
    return this.shouldShowOverlay && !this.searchTerm;
  }

  showOverlay(): void {
    this.shouldShowOverlay = true;
    this.lastViewedNodes = this.recentActivityService.getLastViewedNodes();
    console.log('Showing search overlay', this.lastViewedNodes);
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
      this.applyChangedSearchTerm(selected);
    } else if (selected && 'title' in selected) {
      this.router.navigateByUrl(`/node/${selected.id}`);
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
