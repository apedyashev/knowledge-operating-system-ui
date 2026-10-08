import {
  Component,
  EventEmitter,
  Input,
  Output,
  type OnChanges,
  type SimpleChanges,
} from '@angular/core';

import type { NodeSearchResult } from '#core/services/node-search.service';

@Component({
  selector: 'app-search-overlay',
  imports: [],
  host: {
    class: 'fixed z-[999] inset-0 block',
    '(window:keydown)': 'onWindowKeydown($event)',
  },
  templateUrl: './search-overlay.html',
})
export class SearchOverlay implements OnChanges {
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

  ngOnChanges(changes: SimpleChanges) {
    // Mode switches (recent <-> results) only affect the left column list.
    if (changes['showRecentSearches']) {
      this.resetLeftSelection();
    }

    // Left-side data changes should not keep stale left indices.
    if (changes['recentSearches'] || changes['searchResults']) {
      this.resetLeftSelection();
    }

    // Right-side data changes invalidate right-side selection.
    if (changes['lastViewedNodes']) {
      this.resetRightSelection();
    }
  }

  private resetSelection() {
    this.activeColumn = 'left';
    this.activeLeftIndex = -1;
    this.activeRightIndex = -1;
  }

  private resetLeftSelection(): void {
    if (this.activeColumn === 'left') {
      this.activeLeftIndex = -1;
    }
  }

  private resetRightSelection(): void {
    if (this.activeColumn === 'right') {
      this.activeRightIndex = -1;
    }
  }

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
          const leftIndex = this.getActiveLeftIndexForSelection();
          const selected = this.showRecentSearches
            ? this.recentSearches[leftIndex]
            : this.searchResults[leftIndex];
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

  isLeftItemSelected(index: number): boolean {
    // Before keyboard focus starts, the first left item is visually preselected.
    // Once navigation moves to the right column, left-side default highlight must be cleared.
    return (
      this.activeLeftIndex === index ||
      (this.activeColumn === 'left' &&
        this.activeLeftIndex === -1 &&
        this.activeRightIndex === -1 &&
        index === 0)
    );
  }

  private getActiveLeftIndexForSelection(): number {
    if (this.activeLeftIndex !== -1) {
      return this.activeLeftIndex;
    }

    const hasLeftItems = this.showRecentSearches
      ? this.recentSearches.length > 0
      : this.searchResults.length > 0;

    return hasLeftItems ? 0 : -1;
  }

  private moveHorizontal(targetColumn: 'left' | 'right'): void {
    // If no item is currently focused, left right arrows will be used to move cursor in the search field
    // not to switch columns, so we only switch columns if an item is already focused in either column.
    // if (this.activeLeftIndex === -1 && this.activeRightIndex === -1) {
    if (!this.isAnyItemFocused()) {
      return;
    }

    const hasLeftItems = this.showRecentSearches
      ? this.recentSearches.length > 0
      : this.searchResults.length > 0;
    const hasRightItems = this.lastViewedNodes.length > 0;

    // Ignore horizontal moves to an empty target column to preserve current selection.
    if (
      (targetColumn === 'left' && !hasLeftItems) ||
      (targetColumn === 'right' && !hasRightItems)
    ) {
      return;
    }

    this.activeColumn = targetColumn;

    if (targetColumn === 'left') {
      this.activeLeftIndex = 0;
      this.activeRightIndex = -1;
    } else if (targetColumn === 'right') {
      this.activeLeftIndex = -1;
      this.activeRightIndex = 0;
    }
  }

  private moveVertical(step: -1 | 1): void {
    if (this.activeColumn === 'left' && this.showRecentSearches) {
      this.activeLeftIndex = this.nextLeftIndex(
        this.activeLeftIndex,
        this.recentSearches.length,
        step,
      );
    } else if (this.activeColumn === 'left' && this.searchResults.length > 0) {
      this.activeLeftIndex = this.nextLeftIndex(
        this.activeLeftIndex,
        this.searchResults.length,
        step,
      );
    } else if (this.activeColumn === 'right') {
      this.activeRightIndex = this.nextIndex(
        this.activeRightIndex,
        this.lastViewedNodes.length,
        step,
      );
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
      // Wrap to the last item when pressing ArrowUp on the first item.
      return total - 1;
    } else if (nextIndex >= total) {
      return 0;
    } else {
      return nextIndex;
    }
  }

  private nextLeftIndex(currentIndex: number, total: number, step: -1 | 1): number {
    if (total <= 0) {
      return -1;
    }

    // From default visual preselection (index 0), ArrowDown should move to the next item.
    if (currentIndex === -1 && step > 0) {
      return total > 1 ? 1 : 0;
    }

    return this.nextIndex(currentIndex, total, step);
  }

  private isAnyItemFocused(): boolean {
    if (this.activeLeftIndex !== -1 || this.activeRightIndex !== -1) {
      return true;
    }

    // The default first-left preselection counts as a focused item for left/right navigation.
    return this.showRecentSearches ? this.recentSearches.length > 0 : this.searchResults.length > 0;
  }
}
