import { inject, Injectable } from '@angular/core';
import { Observable, of, map } from 'rxjs';

import { MentionNode } from '../models/mention-node.model';
import { ApiService } from '../../../core/services/api.service';

@Injectable({
  providedIn: 'root'
})
export class NodeMentionSuggestionsService {
  private readonly api = inject(ApiService);

  // Kept as a local constant for now; this method boundary makes swapping to HttpClient trivial later.
  private readonly mockSuggestions: MentionNode[] = [
    
  ];

  getMentionSuggestions(title: string = ''): Observable<MentionNode[]> {
    if (!title.trim()) {
      return of([]);
    }

    // return of(this.mockSuggestions);
    return this.api
      .get<Array<{ id: string; title: string; isStub?: boolean }>>('nodes', {
        params: { search: title }
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