import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { API_BASE_URL } from '../../../core/config/api-base-url.token';
import { SaveNodePayload } from '../models/node-save-payload.model';
import { NodeApiService } from './node-api.service';

describe('NodeApiService', () => {
  let service: NodeApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: '/api' }
      ]
    });

    service = TestBed.inject(NodeApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should PATCH an existing node when nodeId is provided', () => {
    const payload: SaveNodePayload = {
      title: 'Invoice Generation',
      content: {
        type: 'doc',
        content: []
      }
    };

    service.saveNode('node-123', payload).subscribe((response) => {
      expect(response.id).toBe('node-123');
      expect(response.title).toBe(payload.title);
      expect(response.content).toEqual(payload.content);
    });

    const request = httpTestingController.expectOne('/api/nodes/node-123');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(payload);

    request.flush({
      id: 'node-123',
      ...payload,
      updatedAt: '2026-06-20T10:00:00.000Z'
    });
  });

  it('should POST a new node when nodeId is missing', () => {
    const payload: SaveNodePayload = {
      title: 'Untitled',
      content: {
        type: 'doc',
        content: []
      }
    };

    service.saveNode(null, payload).subscribe((response) => {
      expect(response.id).toBe('node-new');
      expect(response.title).toBe(payload.title);
    });

    const request = httpTestingController.expectOne('/api/nodes');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);

    request.flush({
      id: 'node-new',
      ...payload,
      createdAt: '2026-06-20T10:00:00.000Z',
      updatedAt: '2026-06-20T10:00:00.000Z'
    });
  });
});