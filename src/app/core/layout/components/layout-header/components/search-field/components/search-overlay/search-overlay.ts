import { Component, EventEmitter, Output, Input } from '@angular/core';
import { NodeSearchResult } from '#core/services/node-search.service';

@Component({
  selector: 'app-search-overlay',
  imports: [],
  host: {
    class: 'fixed z-[999] inset-0 block',
    '(window:keydown)': 'onWindowKeydown($event)'
  },
  templateUrl: './search-overlay.html'
})
export class SearchOverlay {
  // Parent owns open/close state; overlay only emits close intent to keep this component presentational.
  @Output() closeOverlay = new EventEmitter<void>();
  @Output() selectResult = new EventEmitter<NodeSearchResult | string>();
  // Lists are fed from parent so UI can switch from mock data to API data without changing this component.
  @Input() recentSearches: string[] = [];
  @Input() searchResults: NodeSearchResult[] = [];
  @Input() lastViewedNodes: NodeSearchResult[] = [];
  @Input() showRecentSearches = false;

  // We track list focus explicitly so arrow navigation can switch columns predictably.
  activeColumn: 'left' | 'right' = 'left';
  activeLeftIndex = -1;
  activeRightIndex = -1;

  onCloseClick(): void {
    this.closeOverlay.emit();
  }

  onWindowKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.moveVertical(-1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.moveVertical(1);
        break;
      case 'ArrowLeft':
        this.moveHorizontal('left');
        if (this.isAnyItemFocused()) {
          // no cursor movement should occur in the search field
          event.preventDefault();
        }
        break;
      case 'ArrowRight':
        this.moveHorizontal('right');
        if (this.isAnyItemFocused()) {
          // no cursor movement should occur in the search field
          event.preventDefault();
        }
        break;
      case 'Enter':
        if (this.activeColumn === 'left') {
          const selected = this.showRecentSearches ? this.recentSearches[this.activeLeftIndex] : this.searchResults[this.activeLeftIndex];
          if (selected) {
            this.selectResult.emit(selected);
          }
        } else if (this.activeColumn === 'right') {
          const selected = this.lastViewedNodes[this.activeRightIndex];
          if (selected) {
            this.selectResult.emit(selected);
          }
        }
        break;
      default:
        break;
    }
  }

  onSelectResult($event: Event, selected: string | NodeSearchResult): void {
    $event.preventDefault();
    this.selectResult.emit(selected);
  }

  private moveHorizontal(targetColumn: 'left' | 'right'): void {
    // If no item is currently focused, left right arrows will be used to move cursor in the search field
    // not to switch columns, so we only switch columns if an item is already focused in either column. 
    // if (this.activeLeftIndex === -1 && this.activeRightIndex === -1) {
    if (!this.isAnyItemFocused()) {
      return;
    }

    this.activeColumn = targetColumn;

    if (targetColumn === 'left' && (this.recentSearches.length > 0 || this.searchResults.length > 0 )) {
      this.activeLeftIndex = 0;
      this.activeRightIndex = -1;
    } else if (targetColumn === 'right'  && this.lastViewedNodes.length > 0) {
      this.activeLeftIndex = -1;
      this.activeRightIndex = 0;
    }
  }

  private moveVertical(step: -1 | 1): void {
    if (this.activeColumn === 'left' && this.showRecentSearches) {
      this.activeLeftIndex = this.nextIndex(this.activeLeftIndex, this.recentSearches.length, step);
      return;
    } else if (this.activeColumn === 'left' && this.searchResults.length > 0) {
      this.activeLeftIndex = this.nextIndex(this.activeLeftIndex, this.searchResults.length, step);
      return;
    } else if (this.activeColumn === 'right') {
      this.activeRightIndex = this.nextIndex(this.activeRightIndex, this.lastViewedNodes.length, step);
      return;
    }

  }

  private nextIndex(currentIndex: number, total: number, step: -1 | 1): number {
    if (total <= 0) {
      return -1;
    }

    if (currentIndex === -1) {
      return step > 0 ? 0 : total - 1;
    }

    const nextIndex = currentIndex + step;
    if (nextIndex < 0) {
      // pressing up on the first item should move focus to the search input, so we return -1 to indicate no active item. 
      return -1;
      // return total - 1;
    } else if (nextIndex >= total) {
      return 0;
    } else {
      return nextIndex;
    }
  }

  private isAnyItemFocused(): boolean {
    return this.activeLeftIndex !== -1 || this.activeRightIndex !== -1;
  }
}
