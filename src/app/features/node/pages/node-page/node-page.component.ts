import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { type JSONContent } from '@tiptap/core';
import { catchError, debounceTime, distinctUntilChanged, EMPTY, map, Subject, Subscription, switchMap, tap } from 'rxjs';
import { LeftPanelComponent } from '../../../../core/layout/components/left-panel/left-panel.component';
import { RightPanelComponent } from '../../../../core/layout/components/right-panel/right-panel.component';
import { NodeEditorComponent } from '../../components/node-editor/node-editor.component';
import { SaveNodePayload } from '../../models/node-save-payload.model';
import { NodeApiService } from '../../services/node-api.service';

@Component({
  selector: 'app-node-page',
  standalone: true,
  imports: [LeftPanelComponent, NodeEditorComponent, RightPanelComponent],
  templateUrl: './node-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NodePageComponent implements OnDestroy {
  private readonly nodeApiService = inject(NodeApiService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  protected nodeTitle = '';
  protected nodeContent: JSONContent = {
    type: 'doc',
    content: []
  };

  private readonly saveEvents$ = new Subject<SaveNodePayload>();
  private readonly saveEventsSubscription: Subscription = this.saveEvents$
    .pipe(debounceTime(850))
    .pipe(
      // Container owns side effects so the editor remains API-agnostic and reusable.
      switchMap((payload) =>
        this.nodeApiService.saveNode(this.currentNodeId, payload).pipe(
          catchError((error) => {
            console.error('[NodePage] Node save failed', error);
            return EMPTY;
          })
        )
      )
    )
    .subscribe(() => {
      console.log('[NodePage] Node saved');
    });

  private readonly loadNodeSubscription: Subscription = this.activatedRoute.paramMap
    .pipe(
      map((paramMap) => paramMap.get('id')),
      distinctUntilChanged(),
      switchMap((nodeId) => {
        if (!nodeId) {
          this.nodeTitle = '';
          this.nodeContent = {
            type: 'doc',
            content: []
          };
          return EMPTY;
        }

        return this.nodeApiService.loadNode(nodeId).pipe(
          tap((node) => {
            this.nodeTitle = node.title;
            this.nodeContent = node.content;
            this.changeDetectorRef.markForCheck();
          }),
          catchError((error) => {
            console.error('[NodePage] Node load failed', error);
            this.changeDetectorRef.markForCheck();
            return EMPTY;
          })
        );
      })
    )
    .subscribe();

  private get currentNodeId(): string | null {
    return this.activatedRoute.snapshot.paramMap.get('id');
  }

  protected onNodeChange(payload: SaveNodePayload): void {
    this.saveEvents$.next(payload);
  }

  ngOnDestroy(): void {
    this.loadNodeSubscription.unsubscribe();
    this.saveEventsSubscription.unsubscribe();
    this.saveEvents$.complete();
  }
}
