import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export type NodeSearchResult = {
  id: string;
  title: string;
};

@Injectable({
  providedIn: 'root'
})
export class NodeSearchService {
  // Mock source keeps the UI flow testable until backend search API is connected.
  private readonly mockNodeTitles = [
    {id: '1', title: 'Billing Service'},
    {id: '2', title: 'Retry Policy'},
    {id: '3', title: 'Payment Events'},
    {id: '4', title: 'Refund Policy'},
    {id: '5', title: 'Invoice Generation'},
    {id: '6', title: 'Subscription Lifecycle'}
  ];

  searchNodes(searchTerm: string): Observable<NodeSearchResult[]> {
    console.log(`Searching for nodes with term: "${searchTerm}"`);
    const normalizedTerm = searchTerm.trim().toLowerCase();

    // Keep this method boundary stable so we can swap to HttpClient without touching component code.
    if (!normalizedTerm) {
      return of(this.mockNodeTitles);

    }

    return of(
      this.mockNodeTitles
        .filter(({title}) => title.toLowerCase().includes(normalizedTerm))
        .map(({id, title}) => ({ id, title }))
    );
  }
}
