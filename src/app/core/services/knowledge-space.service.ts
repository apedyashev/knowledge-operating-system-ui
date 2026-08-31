import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';

import { ApiService } from './api.service';

export interface KnowledgeSpaceResult {
  id: string;
  name: string;
  slug: string;
}

@Injectable({
  providedIn: 'root',
})
export class KnowledgeSpaceService {
  private readonly api = inject(ApiService);

  loadKnowledgeSpaces(): Observable<KnowledgeSpaceResult[]> {
    return this.api
      .get<KnowledgeSpaceResult[]>('spaces', { spaceScoped: false })
      .pipe(
        map((spaces) =>
          spaces.map((space) => ({ id: space.id, name: space.name, slug: space.slug })),
        ),
      );
  }
}
