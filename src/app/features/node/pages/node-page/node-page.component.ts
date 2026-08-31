import type { OnDestroy } from '@angular/core';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ViewChild,
  inject,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { type JSONContent } from '@tiptap/core';
import type { Subscription } from 'rxjs';
import {
  EMPTY,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  switchMap,
  tap,
} from 'rxjs';

import { LeftPanelComponent } from '../../../../core/layout/components/left-panel/left-panel.component';
import { RightPanelComponent } from '../../../../core/layout/components/right-panel/right-panel.component';
import { NodeEditorComponent } from '../../components/node-editor/node-editor.component';
import type { SaveNodePayload } from '../../models/node-save-payload.model';
import { NodeApiService } from '../../services/node-api.service';

@Component({
  selector: 'app-node-page',
  standalone: true,
  imports: [LeftPanelComponent, NodeEditorComponent, RightPanelComponent],
  templateUrl: './node-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NodePageComponent implements OnDestroy {
  private readonly nodeApiService = inject(NodeApiService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  @ViewChild(NodeEditorComponent)
  private nodeEditor?: NodeEditorComponent;

  protected nodeTitle = '';
  protected nodeIsStub = false;
  protected nodeContent: JSONContent = {
    type: 'doc',
    content: [],
  };

  private readonly saveEvents$ = new Subject<SaveNodePayload>();
  private readonly saveEventsSubscription: Subscription = this.saveEvents$
    // Wait until typing pauses to avoid firing a request on every keystroke.
    .pipe(debounceTime(850))
    .pipe(
      // switchMap cancels the previous in-flight save if a new change arrives.
      // This keeps only the latest editor state being persisted.
      switchMap((payload) =>
        this.nodeApiService.saveNode(this.currentNodeId, payload).pipe(
          catchError((error) => {
            // Returning EMPTY means: swallow this failed save and keep the stream alive
            // so future editor changes can still be saved.
            console.error('[NodePage] Node save failed', error);
            return EMPTY;
          }),
        ),
      ),
    )
    .subscribe(() => {
      console.log('[NodePage] Node saved');
    });

  // This subscription reacts to route changes (/node/:id) and loads the matching node.
  private readonly loadNodeSubscription: Subscription = this.activatedRoute.paramMap
    .pipe(
      // Extract only the "id" route param from the full ParamMap object.
      map((paramMap) => paramMap.get('id')),
      // Avoid duplicate API calls when the id did not actually change.
      distinctUntilChanged(),
      // switchMap cancels an old load request if navigation changes quickly to another node.
      switchMap((nodeId) => {
        if (!nodeId) {
          // No id means there is no current node context, so reset editor inputs.
          this.nodeTitle = '';
          this.nodeIsStub = false;
          this.nodeContent = {
            type: 'doc',
            content: [],
          };
          // EMPTY completes this inner branch without emitting a value.
          return EMPTY;
        }

        return this.nodeApiService.loadNode(nodeId).pipe(
          // tap is used for side effects: assign loaded data to component state.
          tap((node) => {
            this.nodeTitle = node.title;
            this.nodeIsStub = Boolean(node.isStub);
            this.nodeContent = node.content;
            // OnPush components update on input/reference changes, but explicit markForCheck
            // keeps async flows predictable and easier to reason about while learning.
            this.changeDetectorRef.markForCheck();
          }),
          catchError((error) => {
            console.error('[NodePage] Node load failed', error);
            this.changeDetectorRef.markForCheck();
            // Keep the stream alive after an error so a later route change can retry loading.
            return EMPTY;
          }),
        );
      }),
    )
    .subscribe();

  private get currentNodeId(): string | null {
    return this.activatedRoute.snapshot.paramMap.get('id');
  }

  protected onNodeChange(payload: SaveNodePayload): void {
    this.saveEvents$.next(payload);
  }

  protected onCreateNodeRequested(title: string): void {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      return;
    }

    // Create the missing node as a stub first, then let the editor replace the typed token with the real chip.
    this.nodeApiService
      .saveNode(null, {
        title: trimmedTitle,
        content: {
          type: 'doc',
          content: [],
        },
        isStub: true,
      })
      .subscribe({
        next: (createdNode) => {
          this.nodeEditor?.selectMention({
            id: createdNode.id,
            title: createdNode.title,
            isStub: Boolean(createdNode.isStub),
          });
        },
        error: (error) => {
          console.error('[NodePage] Stub node creation failed', error);
        },
      });
  }

  ngOnDestroy(): void {
    this.loadNodeSubscription.unsubscribe();
    this.saveEventsSubscription.unsubscribe();
    this.saveEvents$.complete();
  }
}
