import { inject, Injectable } from '@angular/core';
import { Observable, of, map } from 'rxjs';

import { MentionNode } from '../models/mention-node.model';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '#app/core/config/api-base-url.token';

@Injectable({
  providedIn: 'root'
})
export class NodeMentionSuggestionsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  // Kept as a local constant for now; this method boundary makes swapping to HttpClient trivial later.
  private readonly mockSuggestions: MentionNode[] = [
    
  ];

  getMentionSuggestions(title: string = ''): Observable<MentionNode[]> {
    if (!title.trim()) {
      return of([]);
    }

    // return of(this.mockSuggestions);
    return this.http
      .get<Array<{ id: string; title: string; isStub?: boolean }>>(`${this.baseUrl}/nodes`, {
        params: { 'title:startsWith': title }
      })
      .pipe(
        map((nodes) =>
          nodes.map((node) => ({
            id: node.id,
            title: node.title,
            isStub: !!node.isStub
          }))
        )
      );
  }
}