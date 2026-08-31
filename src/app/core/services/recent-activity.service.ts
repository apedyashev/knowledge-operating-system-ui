import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RecentActivityService {
  // internal subjects to manage state
  private readonly recentSearchesSubject = new BehaviorSubject<string[]>(this.readRecentSearches());
  private readonly lastViewedNodesSubject = new BehaviorSubject<
    Array<{ id: string; title: string }>
  >(this.readLastViewedNodes());

  // external readonly interface to consume data
  readonly recentSearches$ = this.recentSearchesSubject.asObservable();
  readonly lastViewedNodes$ = this.lastViewedNodesSubject.asObservable();

  private readRecentSearches(): string[] {
    try {
      const recentSearches = localStorage.getItem('recentSearches');
      return recentSearches ? JSON.parse(recentSearches) : [];
    } catch {
      return [];
    }
  }

  addRecentSearch(searchTerm: string): void {
    const normalisedTerm = searchTerm.trim();
    if (!normalisedTerm) {
      return;
    }

    const updatedSearches = [
      normalisedTerm,
      ...this.recentSearchesSubject.value.filter((term) => term !== normalisedTerm),
    ].slice(0, 5);
    localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
    this.recentSearchesSubject.next(updatedSearches);
  }

  private readLastViewedNodes(): Array<{ id: string; title: string }> {
    try {
      const lastViewedNodes = localStorage.getItem('lastViewedNodes');
      return lastViewedNodes ? JSON.parse(lastViewedNodes) : [];
    } catch {
      return [];
    }
  }

  addLastViewedNode(node: { id: string; title: string }): void {
    const lastViewedNodes = this.readLastViewedNodes();

    console.log('Adding last viewed node:', node);
    // Remove the node if it already exists to avoid duplicates
    const existingIndex = lastViewedNodes.findIndex((n) => n.id === node.id);
    if (existingIndex !== -1) {
      lastViewedNodes.splice(existingIndex, 1);
    }

    // Add the new node to the beginning of the list
    lastViewedNodes.unshift(node);

    // Keep only the 5 most recent nodes
    if (lastViewedNodes.length > 7) {
      lastViewedNodes.pop();
    }

    localStorage.setItem('lastViewedNodes', JSON.stringify(lastViewedNodes));

    this.lastViewedNodesSubject.next(lastViewedNodes);
  }
}
