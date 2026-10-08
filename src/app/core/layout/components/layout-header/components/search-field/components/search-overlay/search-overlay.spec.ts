import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { SearchOverlay } from './search-overlay';

describe('SearchOverlay', () => {
  let component: SearchOverlay;
  let fixture: ComponentFixture<SearchOverlay>;

  const getButtonByText = (label: string): HTMLButtonElement => {
    const rootElement = fixture.nativeElement as HTMLElement;
    const allButtons = Array.from(rootElement.querySelectorAll('button'));
    const button = allButtons.find((candidate) => candidate.textContent?.includes(label));
    expect(button).withContext(`Expected button with label: ${label}`).toBeTruthy();
    return button as HTMLButtonElement;
  };

  const checkCrossColumnNavigation = (
    firstLeft: HTMLButtonElement,
    secondLeft: HTMLButtonElement,
    firstRight: HTMLButtonElement,
    secondRight: HTMLButtonElement,
  ) => {
    // the 1st item  in the left column should be preselected by default
    expect(firstLeft.getAttribute('aria-selected')).toBe('true');
    expect(secondLeft.getAttribute('aria-selected')).toBe('false');
    expect(firstRight.getAttribute('aria-selected')).toBe('false');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();

    // ArrowDown again moves highlight to the next recent-search item.
    expect(firstLeft.getAttribute('aria-selected')).toBe('false');
    expect(secondLeft.getAttribute('aria-selected')).toBe('true');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();

    // ArrowRight switches to the right column and highlights its first item.
    expect(secondLeft.getAttribute('aria-selected')).toBe('false');
    expect(firstRight.getAttribute('aria-selected')).toBe('true');

    // ArrowDown selects the 2nd item in the right column
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();

    expect(firstRight.getAttribute('aria-selected')).toBe('false');
    expect(secondRight.getAttribute('aria-selected')).toBe('true');

    // ArrowDown on the last item selects the 1st item in the right column (starts from the beginning)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();

    expect(firstRight.getAttribute('aria-selected')).toBe('true');
    expect(secondRight.getAttribute('aria-selected')).toBe('false');

    // ArrowUp on the 1st item moves the highlight to the last item in the right column
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    fixture.detectChanges();

    expect(firstRight.getAttribute('aria-selected')).toBe('false');
    expect(secondRight.getAttribute('aria-selected')).toBe('true');

    // ArrowLeft switches to the left column and selects the 1st item
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    fixture.detectChanges();

    expect(firstLeft.getAttribute('aria-selected')).toBe('true');
    expect(secondLeft.getAttribute('aria-selected')).toBe('false');
    expect(firstRight.getAttribute('aria-selected')).toBe('false');

    // ArrowDown moves the highlight to the next item in the left column
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();

    expect(firstLeft.getAttribute('aria-selected')).toBe('false');
    expect(secondLeft.getAttribute('aria-selected')).toBe('true');

    // ArrowDown on the last item moves the highlight to the 1st item in the left column
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();

    expect(firstLeft.getAttribute('aria-selected')).toBe('true');
    expect(secondLeft.getAttribute('aria-selected')).toBe('false');

    // ArrowUp on the 1st item moves the highlight to the last item in the left column
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    fixture.detectChanges();

    expect(firstLeft.getAttribute('aria-selected')).toBe('false');
    expect(secondLeft.getAttribute('aria-selected')).toBe('true');
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchOverlay],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchOverlay);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    const rootElement = fixture.nativeElement as HTMLElement;
    const dialogElement = rootElement.querySelector('[role="dialog"]');

    expect(dialogElement).toBeTruthy();
    expect(dialogElement?.getAttribute('aria-modal')).toBe('true');
    expect(dialogElement?.getAttribute('role')).toBe('dialog');
  });

  it('emits closeOverlay when the close button is clicked', () => {
    const closeSpy = spyOn(component.closeOverlay, 'emit');
    const rootElement = fixture.nativeElement as HTMLElement;
    const closeButton = rootElement.querySelector('button[aria-label="Close search"]');

    expect(closeButton).toBeTruthy();

    (closeButton as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('renders empty-state message for recent searches', () => {
    component.showRecentSearches = true;
    component.recentSearches = [];
    component.searchResults = [
      { id: '1', title: 'search result 1' },
      { id: '2', title: 'search result 2' },
    ];
    component.lastViewedNodes = [
      { id: 'n-1', title: 'System Design Notes' },
      { id: 'n-2', title: 'API Contracts' },
    ] as const;

    fixture.detectChanges();

    const rootElement = fixture.nativeElement as HTMLElement;
    expect(rootElement.textContent).toContain('No recent searches yet.');
    expect(rootElement.querySelector('[aria-label="Recent searches"]')).toBeNull();
  });

  it('renders empty-state message for search results', () => {
    component.showRecentSearches = false;
    component.recentSearches = ['Graph traversal', 'Node clustering'];
    component.searchResults = [];
    component.lastViewedNodes = [
      { id: 'n-1', title: 'System Design Notes' },
      { id: 'n-2', title: 'API Contracts' },
    ] as const;

    fixture.detectChanges();

    const rootElement = fixture.nativeElement as HTMLElement;
    expect(rootElement.textContent).toContain('No results yet.');
    expect(rootElement.querySelector('[aria-label="Search results"]')).toBeNull();
  });

  it('renders empty-state message for last viewed nodes', () => {
    component.showRecentSearches = true;
    component.recentSearches = ['Graph traversal', 'Node clustering'];
    component.searchResults = [
      { id: '1', title: 'search result 1' },
      { id: '2', title: 'search result 2' },
    ];
    component.lastViewedNodes = [];

    fixture.detectChanges();

    const rootElement = fixture.nativeElement as HTMLElement;
    expect(rootElement.textContent).toContain('No viewed nodes yet.');
    expect(rootElement.querySelector('[aria-label="Last viewed nodes"]')).toBeNull();
  });

  it('renders recent searches and last viewed nodes and handles items navigation', () => {
    component.showRecentSearches = true;
    component.recentSearches = ['Graph traversal', 'Node clustering'];
    component.searchResults = [
      { id: '1', title: 'search result 1' },
      { id: '2', title: 'search result 2' },
    ];
    component.lastViewedNodes = [
      { id: 'n-1', title: 'System Design Notes' },
      { id: 'n-2', title: 'API Contracts' },
    ] as const;

    fixture.detectChanges();

    const rootElement = fixture.nativeElement as HTMLElement;

    expect(rootElement.textContent).toContain('Recent Searches');
    expect(rootElement.textContent).toContain('Graph traversal');
    expect(rootElement.textContent).toContain('Node clustering');

    expect(rootElement.textContent).toContain('Last viewed Nodes');
    expect(rootElement.textContent).toContain('System Design Notes');
    expect(rootElement.textContent).toContain('API Contracts');

    // "Recent searches" is displayed instead of search results
    expect(rootElement.textContent).not.toContain('Results');
    expect(rootElement.textContent).not.toContain('search result 1');
    expect(rootElement.textContent).not.toContain('search result 2');

    // arrow keys navigration tests
    const firstLeft = getButtonByText('Graph traversal');
    const secondLeft = getButtonByText('Node clustering');
    const firstRight = getButtonByText('System Design Notes');
    const secondRight = getButtonByText('API Contracts');

    checkCrossColumnNavigation(firstLeft, secondLeft, firstRight, secondRight);
  });

  it('renders search results and last viewed nodes handles items navigation', () => {
    component.showRecentSearches = false;
    component.recentSearches = ['Graph traversal', 'Node clustering'];
    component.searchResults = [
      { id: '1', title: 'search result 1' },
      { id: '2', title: 'search result 2' },
    ];
    component.lastViewedNodes = [
      { id: 'n-1', title: 'System Design Notes' },
      { id: 'n-2', title: 'API Contracts' },
    ] as const;

    fixture.detectChanges();

    const rootElement = fixture.nativeElement as HTMLElement;

    // "Results" is displayed instead of Recent Searches
    expect(rootElement.textContent).not.toContain('Recent Searches');
    expect(rootElement.textContent).not.toContain('Graph traversal');
    expect(rootElement.textContent).not.toContain('Node clustering');

    expect(rootElement.textContent).toContain('Last viewed Nodes');
    expect(rootElement.textContent).toContain('System Design Notes');
    expect(rootElement.textContent).toContain('API Contracts');

    expect(rootElement.textContent).toContain('Results');
    expect(rootElement.textContent).toContain('search result 1');
    expect(rootElement.textContent).toContain('search result 2');

    // arrow keys navigration tests
    const firstLeft = getButtonByText('search result 1');
    const secondLeft = getButtonByText('search result 2');
    const firstRight = getButtonByText('System Design Notes');
    const secondRight = getButtonByText('API Contracts');

    checkCrossColumnNavigation(firstLeft, secondLeft, firstRight, secondRight);
  });

  it('resets the selection when the search results are updated', () => {
    component.showRecentSearches = false;
    component.recentSearches = ['Graph traversal', 'Node clustering'];
    component.searchResults = [
      { id: '1', title: 'search result 1' },
      { id: '2', title: 'search result 2' },
    ];
    component.lastViewedNodes = [
      { id: 'n-1', title: 'System Design Notes' },
      { id: 'n-2', title: 'API Contracts' },
    ] as const;

    fixture.detectChanges();

    const firstLeft = getButtonByText('search result 1');
    const secondLeft = getButtonByText('search result 2');

    // Move selection to the 2nd result.
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();

    expect(firstLeft.getAttribute('aria-selected')).toBe('false');
    expect(secondLeft.getAttribute('aria-selected')).toBe('true');

    // Update left-column data through Angular input binding.
    const updatedSearchResults = [
      { id: '3', title: 'search result 3' },
      { id: '4', title: 'search result 4' },
    ];
    fixture.componentRef.setInput('searchResults', updatedSearchResults);
    fixture.detectChanges();

    const updatedFirstLeft = getButtonByText('search result 3');
    const updatedSecondLeft = getButtonByText('search result 4');

    expect(updatedFirstLeft.getAttribute('aria-selected')).toBe('true');
    expect(updatedSecondLeft.getAttribute('aria-selected')).toBe('false');
  });

  it('resets the selection when recent searches are updated', () => {
    component.showRecentSearches = true;
    component.recentSearches = ['Graph traversal', 'Node clustering'];
    component.searchResults = [
      { id: '1', title: 'search result 1' },
      { id: '2', title: 'search result 2' },
    ];
    component.lastViewedNodes = [
      { id: 'n-1', title: 'System Design Notes' },
      { id: 'n-2', title: 'API Contracts' },
    ] as const;

    fixture.detectChanges();

    const firstLeft = getButtonByText('Graph traversal');
    const secondLeft = getButtonByText('Node clustering');

    // Move selection to the 2nd recent-search item.
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();

    expect(firstLeft.getAttribute('aria-selected')).toBe('false');
    expect(secondLeft.getAttribute('aria-selected')).toBe('true');

    // Update left-column recent-search data via Angular input binding.
    const updatedRecentSearches = ['Updated search 1', 'Updated search 2'];
    fixture.componentRef.setInput('recentSearches', updatedRecentSearches);
    fixture.detectChanges();

    const updatedFirstLeft = getButtonByText('Updated search 1');
    const updatedSecondLeft = getButtonByText('Updated search 2');

    expect(updatedFirstLeft.getAttribute('aria-selected')).toBe('true');
    expect(updatedSecondLeft.getAttribute('aria-selected')).toBe('false');
  });

  it('resets the right-column selection when last viewed nodes are updated', () => {
    const selectResultSpy = spyOn(component.selectResult, 'emit');

    component.showRecentSearches = true;
    component.recentSearches = ['Graph traversal', 'Node clustering'];
    component.searchResults = [
      { id: '1', title: 'search result 1' },
      { id: '2', title: 'search result 2' },
    ];
    component.lastViewedNodes = [
      { id: 'n-1', title: 'System Design Notes' },
      { id: 'n-2', title: 'API Contracts' },
    ] as const;

    fixture.detectChanges();

    // Move to right column and select the 2nd item.
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();

    const firstRight = getButtonByText('System Design Notes');
    const secondRight = getButtonByText('API Contracts');
    expect(firstRight.getAttribute('aria-selected')).toBe('false');
    expect(secondRight.getAttribute('aria-selected')).toBe('true');

    // Update right-column data via Angular input binding; active right selection should be invalidated.
    const updatedLastViewedNodes = [
      { id: 'n-3', title: 'Domain Modeling' },
      { id: 'n-4', title: 'Queueing Theory' },
    ];
    fixture.componentRef.setInput('lastViewedNodes', updatedLastViewedNodes);
    fixture.detectChanges();

    const updatedFirstRight = getButtonByText('Domain Modeling');
    const updatedSecondRight = getButtonByText('Queueing Theory');

    expect(updatedFirstRight.getAttribute('aria-selected')).toBe('false');
    expect(updatedSecondRight.getAttribute('aria-selected')).toBe('false');

    // Selection was reset, so Enter must not emit a stale right-column item.
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(selectResultSpy).not.toHaveBeenCalled();
  });

  it('does not switch to the right column if it is empty', () => {
    component.showRecentSearches = true;
    component.recentSearches = ['Graph traversal', 'Node clustering'];
    component.searchResults = [
      { id: '1', title: 'search result 1' },
      { id: '2', title: 'search result 2' },
    ];
    component.lastViewedNodes = [] as const;

    fixture.detectChanges();

    const firstLeft = getButtonByText('Graph traversal');
    expect(firstLeft.getAttribute('aria-selected')).toBe('true');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();

    // still selected
    expect(firstLeft.getAttribute('aria-selected')).toBe('true');
  });

  describe('If search results are rendered instead of recent searches', () => {
    it('resets the LEFT-column selection', () => {
      const selectResultSpy = spyOn(component.selectResult, 'emit');
      component.showRecentSearches = true;
      component.recentSearches = ['Graph traversal', 'Node clustering'];
      component.searchResults = [
        { id: '1', title: 'search result 1' },
        { id: '2', title: 'search result 2' },
      ];
      component.lastViewedNodes = [
        { id: 'n-1', title: 'System Design Notes' },
        { id: 'n-2', title: 'API Contracts' },
      ] as const;

      fixture.detectChanges();

      const rootElement = fixture.nativeElement as HTMLElement;

      const firstRecentSearch = getButtonByText('Graph traversal');
      const secondRecentSearch = getButtonByText('Node clustering');

      // select the 2nd recent search
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      fixture.detectChanges();
      expect(firstRecentSearch.getAttribute('aria-selected')).toBe('false');
      expect(secondRecentSearch.getAttribute('aria-selected')).toBe('true');

      // show the search results instead of the recent searches
      fixture.componentRef.setInput('showRecentSearches', false);
      fixture.detectChanges();

      expect(rootElement.textContent).not.toContain('Recent Searches');
      expect(rootElement.textContent).not.toContain('Graph traversal');

      // selection reset - now the 1st item is selected (default selection)
      const firstSearchResult = getButtonByText('search result 1');
      expect(rootElement.textContent).toContain('Results');
      expect(firstSearchResult.getAttribute('aria-selected')).toBe('true');

      // Pressing ENTER on the selected search result emits selectResult
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(selectResultSpy).toHaveBeenCalledWith({ id: '1', title: 'search result 1' });
    });

    it('does NOT reset the RIGHT-column selection', () => {
      // Initial state: preselect the 1st item in the right column
      component.showRecentSearches = true;
      component.recentSearches = ['Graph traversal', 'Node clustering'];
      component.searchResults = [
        { id: '1', title: 'search result 1' },
        { id: '2', title: 'search result 2' },
      ];
      component.lastViewedNodes = [
        { id: 'n-1', title: 'System Design Notes' },
        { id: 'n-2', title: 'API Contracts' },
      ] as const;

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      fixture.detectChanges();

      const firstRight = getButtonByText('System Design Notes');
      expect(firstRight.getAttribute('aria-selected')).toBe('true');

      // Action: show the search results instead of the recent searches
      fixture.componentRef.setInput('showRecentSearches', false);
      fixture.detectChanges();

      // Test: check that the 1st item in the right column is still selected
      expect(firstRight.getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('emits selectResult', () => {
    it('when press ENTER in both columns', () => {
      const selectResultSpy = spyOn(component.selectResult, 'emit');

      // Initial state: the 1st initial search is preselected by default
      component.showRecentSearches = true;
      component.recentSearches = ['Graph traversal', 'Node clustering'];
      component.searchResults = [
        { id: '1', title: 'search result 1' },
        { id: '2', title: 'search result 2' },
      ];
      component.lastViewedNodes = [
        { id: 'n-1', title: 'System Design Notes' },
        { id: 'n-2', title: 'API Contracts' },
      ] as const;

      // Action: ENTER on the default selection
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      // Verify: component emits the correct item
      expect(selectResultSpy).toHaveBeenCalledWith('Graph traversal');

      // verify Enter press on the next item
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(selectResultSpy).toHaveBeenCalledWith('Node clustering');

      // Switch to the right column
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(selectResultSpy).toHaveBeenCalledWith({ id: 'n-1', title: 'System Design Notes' });

      // verify Enter press on the next item
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(selectResultSpy).toHaveBeenCalledWith({ id: 'n-2', title: 'API Contracts' });
    });

    it('when click on an item', () => {
      const selectResultSpy = spyOn(component.selectResult, 'emit');

      component.showRecentSearches = true;
      component.recentSearches = ['Graph traversal', 'Node clustering'];

      fixture.detectChanges();

      const firstLeft = getButtonByText('Graph traversal');
      firstLeft.click();

      expect(selectResultSpy).toHaveBeenCalledWith('Graph traversal');
    });

    it('does not emit when nothing is rendered ent ENTER is pressed', () => {
      const selectResultSpy = spyOn(component.selectResult, 'emit');

      component.showRecentSearches = true;
      component.recentSearches = [];

      fixture.detectChanges();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(selectResultSpy).not.toHaveBeenCalled();
    });

    it('does not change focus state when Arrow keys are pressed in a fully empty overlay', () => {
      const selectResultSpy = spyOn(component.selectResult, 'emit');

      component.showRecentSearches = false;
      component.recentSearches = [];
      component.searchResults = [];
      component.lastViewedNodes = [];

      fixture.detectChanges();

      const rootElement = fixture.nativeElement as HTMLElement;
      expect(rootElement.querySelectorAll('button[role="option"]').length).toBe(0);

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      fixture.detectChanges();

      expect(
        rootElement.querySelectorAll('button[role="option"][aria-selected="true"]').length,
      ).toBe(0);
      expect(selectResultSpy).not.toHaveBeenCalled();
    });
  });
});
