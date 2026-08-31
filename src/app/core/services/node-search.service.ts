import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';

import { ApiService } from './api.service';

export interface NodeSearchResult {
  id: string;
  title: string;
}

@Injectable({
  providedIn: 'root',
})
export class NodeSearchService {
  private readonly api = inject(ApiService);

  searchNodes(searchTerm: string): Observable<NodeSearchResult[]> {
    return this.api
      .get<Array<{ id: string; title: string }>>('nodes', {
        params: { search: searchTerm },
      })
      .pipe(map((nodes) => nodes.map((node) => ({ id: node.id, title: node.title }))));
  }
}
