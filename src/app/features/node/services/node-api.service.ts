import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api-base-url.token';
import { SaveNodePayload } from '../models/node-save-payload.model';

export type NodeResponse = SaveNodePayload & {
  id: string;
  ownerId?: string;
  spaceId?: string;
  isStub?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

@Injectable({
  providedIn: 'root'
})
export class NodeApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  // Blueprint-aligned persistence: update an existing node when route id exists, otherwise create one.
  saveNode(nodeId: string | null, payload: SaveNodePayload): Observable<NodeResponse> {
    if (nodeId) {
      return this.http.patch<NodeResponse>(`${this.baseUrl}/nodes/${encodeURIComponent(nodeId)}`, payload);
    }

    return this.http.post<NodeResponse>(`${this.baseUrl}/nodes`, payload);
  }

  loadNode(nodeId: string): Observable<NodeResponse> {
    return this.http.get<NodeResponse>(`${this.baseUrl}/nodes/${encodeURIComponent(nodeId)}`);
  }
}