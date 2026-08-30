import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';

export type NodeSearchResult = {
  id: string;
  title: string;
};

@Injectable({
  providedIn: 'root'
})
export class NodeSearchService {
  private readonly api = inject(ApiService);

  searchNodes(searchTerm: string): Observable<NodeSearchResult[]> {
    return this.api.get<Array<{ id: string; title: string }>>('nodes', {
      params: { search: searchTerm }
    }).pipe(
      map((nodes) => nodes.map((node) => ({ id: node.id, title: node.title })))
    );
  }
}
