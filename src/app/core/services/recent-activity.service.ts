import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class RecentActivityService {
  getRecentSearches(): string[] {
    const recentSearches = localStorage.getItem('recentSearches');
    return recentSearches ? JSON.parse(recentSearches) : [];
  }

  addRecentSearch(searchTerm: string): void {
    const recentSearches = this.getRecentSearches();

    if (!recentSearches.includes(searchTerm) && recentSearches.length < 5) {
      recentSearches.push(searchTerm);
      localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    }
  }
  
  getLastViewedNodes(): { id: string; title: string }[] {
    const lastViewedNodes = localStorage.getItem('lastViewedNodes');
    return lastViewedNodes ? JSON.parse(lastViewedNodes) : [];
  }

  addLastViewedNode(node: { id: string; title: string }): void {
    const lastViewedNodes = this.getLastViewedNodes();

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
  }


}
