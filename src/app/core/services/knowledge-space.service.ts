import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { API_BASE_URL } from '#app/core/config/api-base-url.token';

export type KnowledgeSpaceResult = {
  id: string;
  name: string;
};

@Injectable({
  providedIn: 'root'
})
export class KnowledgeSpaceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  loadKnowledgeSpaces( ): Observable<KnowledgeSpaceResult[]> {
    return this.http.get<Array<KnowledgeSpaceResult>>(`${this.baseUrl}/spaces`, ).pipe(
      map((spaces) => spaces.map((space) => ({ id: space.id, name: space.name })))
    );
  }
}
