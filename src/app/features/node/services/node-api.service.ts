import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import type { SaveNodePayload } from '../models/node-save-payload.model';

export type NodeResponse = SaveNodePayload & {
  id: string;
  ownerId?: string;
  spaceId?: string;
  isStub?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

@Injectable({
  providedIn: 'root',
})
export class NodeApiService {
  private readonly api = inject(ApiService);

  // Blueprint-aligned persistence: update an existing node when route id exists, otherwise create one.
  saveNode(nodeId: string | null, payload: SaveNodePayload): Observable<NodeResponse> {
    if (nodeId) {
      return this.api.patch<NodeResponse>(`nodes/${encodeURIComponent(nodeId)}`, payload);
    }

    return this.api.post<NodeResponse>('nodes', payload);
  }

  loadNode(nodeId: string): Observable<NodeResponse> {
    return this.api.get<NodeResponse>(`nodes/${encodeURIComponent(nodeId)}`);
  }
}
