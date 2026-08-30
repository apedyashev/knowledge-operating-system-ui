import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';

export type KnowledgeSpaceResult = {
  id: string;
  name: string;
  slug: string;
};

@Injectable({
  providedIn: 'root'
})
export class KnowledgeSpaceService {
  private readonly api = inject(ApiService);

  loadKnowledgeSpaces(): Observable<KnowledgeSpaceResult[]> {
    return this.api.get<Array<KnowledgeSpaceResult>>('spaces', { spaceScoped: false }).pipe(
      map((spaces) => spaces.map((space) => ({ id: space.id, name: space.name, slug: space.slug })))
    );
  }
}
