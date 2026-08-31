import type { OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Editor, type JSONContent } from '@tiptap/core';
import Placeholder from '@tiptap/extension-placeholder';
import type { EditorState } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import {
  TiptapBubbleMenuDirective,
  TiptapEditorDirective,
  TiptapFloatingMenuDirective,
} from 'ngx-tiptap';
import {
  Subject,
  Subscription,
  catchError,
  debounceTime,
  distinctUntilChanged,
  of,
  switchMap,
  take,
} from 'rxjs';

import { MentionSuggestionsComponent } from '#app/features/node/components/node-editor/components/mention-suggestions/mention-suggestions.component';

import type { MentionNode } from '../../models/mention-node.model';
import type { SaveNodePayload } from '../../models/node-save-payload.model';
import type { NodeResponse } from '../../services/node-api.service';
import { NodeApiService } from '../../services/node-api.service';
import { NodeMentionSuggestionsService } from '../../services/node-mention-suggestions.service';
import { KnowledgeMention } from './knowledge-mention';

type MentionMenuOption =
  | {
      kind: 'create';
      title: string;
    }
  | {
      kind: 'existing';
      node: MentionNode;
    };

@Component({
  selector: 'app-node-editor',
  standalone: true,
  imports: [
    FormsModule,
    TiptapEditorDirective,
    TiptapBubbleMenuDirective,
    TiptapFloatingMenuDirective,
    MentionSuggestionsComponent,
  ],
  templateUrl: './node-editor.component.html',
  styleUrl: './node-editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NodeEditorComponent implements OnInit, OnChanges, OnDestroy {
  private slashRange: { from: number; to: number } | null = null;
  private mentionRange: { from: number; to: number } | null = null;
  private readonly mentionQueryChanges$ = new Subject<string>();
  private readonly mentionSuggestionsService = inject(NodeMentionSuggestionsService);
  private readonly nodeApiService = inject(NodeApiService);
  private readonly router = inject(Router);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly hoverContentSubscriptions = new Subscription();
  private readonly mentionMetadataSubscriptions = new Subscription();
  private readonly mentionContentCache = new Map<string, string>();
  private readonly mentionStubStateCache = new Map<string, boolean>();
  private mentionSuggestionsSubscription?: Subscription;

  @Input() initialTitle = '';
  @Input() initialIsStub = false;
  @Input() initialContent: JSONContent = {
    type: 'doc',
    content: [],
  };

  // The editor emits pure state changes; persistence is orchestrated by the page container.
  @Output() readonly nodeChange = new EventEmitter<SaveNodePayload>();

  // The page container handles stub-node creation when the user asks to create a missing reference.
  @Output() readonly createNodeRequested = new EventEmitter<string>();

  // Title is stored separately from editor body so API payload matches backend contract.
  protected title = '';
  protected isStub = false;

  @ViewChild(MentionSuggestionsComponent)
  private mentionSuggestionsComponent?: MentionSuggestionsComponent;

  // The editor instance owns TipTap's document state and command API.
  protected readonly editor = new Editor({
    content: ``,
    extensions: [
      StarterKit,
      KnowledgeMention,
      // Placeholder text helps replicate the guided empty-state behavior from Notion-style editors.
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return 'Untitled section';
          }

          return "Type '/' for commands";
        },
      }),
    ],
    editorProps: {
      // This keeps the Blueprint shortcut working: Ctrl/Cmd + Space opens the mention picker by inserting '@'.
      handleKeyDown: (_view, event) => this.handleEditorKeyDown(event),
      handleClickOn: (_view, _pos, node, _nodePos, event) => {
        if (node.type.name !== 'knowledgeMention') {
          return false;
        }

        const rawNodeId = String(node.attrs['nodeId'] ?? '').trim();
        if (!rawNodeId) {
          return false;
        }

        event.preventDefault();
        this.router.navigate(['/node', rawNodeId]);
        return true;
      },
      handleDOMEvents: {
        mousedown: (_view, event) => {
          const clickTarget = event.target as HTMLElement | null;
          const chip = clickTarget?.closest('a.node-page-link') as HTMLElement | null;

          if (!chip) {
            return false;
          }

          event.preventDefault();
          return true;
        },
        click: (_view, event) => {
          const clickTarget = event.target as HTMLElement | null;
          const chip = clickTarget?.closest('a.node-page-link') as HTMLElement | null;
          const nodeId = chip?.dataset['nodeId'];

          if (!chip || !nodeId) {
            return false;
          }

          event.preventDefault();
          this.router.navigate(['/node', decodeURIComponent(nodeId)]);
          return true;
        },
        mouseover: (_view, event) => {
          this.onMentionChipHover(event);
          return false;
        },
      },
      attributes: {
        class: 'notion-editor-content text-slate-800 focus:outline-none',
      },
    },
  });

  // Keeping the content as HTML makes it easy to send to the backend in MVP.
  protected content = '';

  // Mention options now come from a dedicated service boundary instead of hardcoded inline data.
  protected mentionSuggestions: MentionNode[] = [];

  protected mentionQuery = '';
  protected mentionMenuActiveIndex = 0;

  // This keyboard shortcut mirrors the Blueprint's Node Picker trigger without duplicating picker UI state.
  protected handleEditorKeyDown(event: KeyboardEvent): boolean {
    if (this.handleMentionMenuKeyDown(event)) {
      return true;
    }

    if (event.key !== ' ' || (!event.ctrlKey && !event.metaKey) || event.altKey) {
      return false;
    }

    event.preventDefault();

    this.editor.chain().focus().insertContent('@').run();

    this.onEditorStateChange();
    return true;
  }

  ngOnInit(): void {
    this.mentionSuggestionsSubscription = this.mentionQueryChanges$
      .pipe(
        debounceTime(180),
        distinctUntilChanged(),
        switchMap((query) =>
          this.mentionSuggestionsService.getMentionSuggestions(query).pipe(
            catchError((error) => {
              console.error('[NodeEditor] Failed to load mention suggestions', error);
              return of([] as MentionNode[]);
            }),
          ),
        ),
      )
      .subscribe((suggestions) => {
        this.mentionSuggestions = suggestions;
        this.clampMentionMenuActiveIndex();
        this.changeDetectorRef.markForCheck();
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialTitle']) {
      this.title = this.initialTitle;
    }

    if (changes['initialIsStub']) {
      this.isStub = Boolean(this.initialIsStub);
    }

    if (changes['initialContent'] && this.initialContent) {
      // Setting emitUpdate=false prevents autosave loops when data is loaded from the backend.
      this.editor.commands.setContent(this.initialContent, { emitUpdate: false });
      this.scheduleMentionChipMetadataPrefetch();
    }
  }

  private scheduleMentionChipMetadataPrefetch(): void {
    queueMicrotask(() => {
      this.prefetchMentionChipMetadata();
    });
  }

  private prefetchMentionChipMetadata(): void {
    const renderedChips = Array.from(
      this.editor.view.dom.querySelectorAll('a.node-page-link[data-node-id]'),
    ) as HTMLElement[];

    const uniqueNodeIds = Array.from(
      new Set(
        renderedChips
          .map((chip) => chip.dataset['nodeId']?.trim() ?? '')
          .filter((nodeId) => Boolean(nodeId)),
      ),
    );

    for (const nodeId of uniqueNodeIds) {
      const cachedStubState = this.mentionStubStateCache.get(nodeId);

      if (typeof cachedStubState === 'boolean') {
        this.applyStubStateToRenderedChips(nodeId, cachedStubState);
        continue;
      }

      const metadataRequest = this.nodeApiService
        .loadNode(nodeId)
        .pipe(
          take(1),
          catchError(() => of(null as NodeResponse | null)),
        )
        .subscribe((node) => {
          if (!node) {
            return;
          }

          const isStub = Boolean(node.isStub);
          this.mentionStubStateCache.set(nodeId, isStub);
          this.mentionContentCache.set(nodeId, this.extractNodeContent(node));
          this.applyStubStateToRenderedChips(nodeId, isStub);
        });

      this.mentionMetadataSubscriptions.add(metadataRequest);
    }
  }

  private applyStubStateToRenderedChips(nodeId: string, isStub: boolean): void {
    const renderedChips = Array.from(
      this.editor.view.dom.querySelectorAll('a.node-page-link[data-node-id]'),
    ) as HTMLElement[];

    for (const chip of renderedChips) {
      if (chip.dataset['nodeId'] !== nodeId) {
        continue;
      }

      if (isStub) {
        chip.classList.add('node-page-link-stub');
        chip.setAttribute('data-is-stub', 'true');
      } else {
        chip.classList.remove('node-page-link-stub');
        chip.setAttribute('data-is-stub', 'false');
      }
    }
  }

  // This returns the exact shape expected by node create/update APIs.
  protected buildNodePayload(): SaveNodePayload {
    const content = this.editor.getJSON();
    const title = this.title.trim() || 'Untitled';

    return { title, content, isStub: this.isStub };
  }

  protected toggleStubStatus(): void {
    this.isStub = !this.isStub;
    this.onEditorStateChange();
  }

  // Title changes should flow through the same debounced stream as editor body changes.
  protected onTitleChange(): void {
    this.onEditorStateChange();
  }

  // Fallback title extraction helps recover data if title input is accidentally empty.
  protected extractTitleFromContent(html: string): string {
    const document = new DOMParser().parseFromString(html, 'text/html');
    const heading = document.querySelector('h1, h2');

    return (heading?.textContent ?? '').trim();
  }

  // We funnel every title/body change through one stream so debounce logic stays centralized.
  protected onEditorStateChange(): void {
    this.nodeChange.emit(this.buildNodePayload());
  }

  // We hide the formatting menu while mention or slash menus are active to reduce overlap.
  protected shouldShowFormattingMenu = (props: {
    editor: Editor;
    state: EditorState;
    from: number;
    to: number;
  }): boolean => {
    if (this.shouldShowMentionMenu(props) || this.shouldShowSlashMenu(props)) {
      return false;
    }

    // Avoid showing the floating formatting menu on a plain caret click.
    return props.from !== props.to;
  };

  // Slash command mode becomes active when the user types /query in the current text block.
  protected shouldShowSlashMenu = (props: {
    editor: Editor;
    state: EditorState;
    from: number;
    to: number;
  }): boolean => {
    const { state, from, to } = props;

    if (from !== to) {
      this.slashRange = null;
      return false;
    }

    const { $from } = state.selection;
    const textBeforeCursor = $from.parent.textBetween(0, $from.parentOffset, ' ', ' ');
    if (!textBeforeCursor || !textBeforeCursor.includes('/')) {
      this.slashRange = null;
      return false;
    }

    const lastToken = textBeforeCursor.split(/\s+/).pop() ?? '';

    if (!lastToken.startsWith('/')) {
      this.slashRange = null;
      return false;
    }

    const rawSlash = lastToken;
    this.slashRange = {
      from: from - rawSlash.length,
      to: from,
    };

    return true;
  };

  // Mention mode becomes active when the user types @query in the current text block.
  protected shouldShowMentionMenu = (props: {
    editor: Editor;
    state: EditorState;
    from: number;
    to: number;
  }): boolean => {
    const { state, from, to } = props;

    if (from !== to) {
      this.mentionRange = null;
      this.updateMentionQuery('');
      this.mentionMenuActiveIndex = 0;
      return false;
    }

    const { $from } = state.selection;
    const textBeforeCursor = $from.parent.textBetween(0, $from.parentOffset, ' ', ' ');
    // Allow multi-word node titles (e.g. "Active User") while typing after @.
    const mentionMatch = /(^|\s)@([^@]*)$/.exec(textBeforeCursor);

    if (!mentionMatch) {
      this.mentionRange = null;
      this.updateMentionQuery('');
      this.mentionMenuActiveIndex = 0;
      return false;
    }

    const rawMention = `@${mentionMatch[2]}`;
    this.mentionRange = {
      from: from - rawMention.length,
      to: from,
    };
    this.updateMentionQuery(mentionMatch[2]);
    this.clampMentionMenuActiveIndex();

    return true;
  };

  private handleMentionMenuKeyDown(event: KeyboardEvent): boolean {
    if (!this.mentionRange) {
      return false;
    }

    const options = this.getMentionMenuOptions();

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();

        if (options.length > 0) {
          this.mentionMenuActiveIndex = (this.mentionMenuActiveIndex + 1) % options.length;
          this.changeDetectorRef.markForCheck();
        }

        return true;
      }
      case 'ArrowUp': {
        event.preventDefault();

        if (options.length > 0) {
          this.mentionMenuActiveIndex =
            (this.mentionMenuActiveIndex - 1 + options.length) % options.length;
          this.changeDetectorRef.markForCheck();
        }

        return true;
      }
      case 'Enter':
      case 'Tab': {
        if (options.length === 0) {
          return false;
        }

        event.preventDefault();
        const selectedOption = options[this.mentionMenuActiveIndex] ?? options[0];

        if (!selectedOption) {
          return true;
        }

        if (selectedOption.kind === 'create') {
          this.onCreateMentionRequested(selectedOption.title);
          return true;
        }

        this.selectMention(selectedOption.node);
        return true;
      }
      case 'Escape': {
        event.preventDefault();
        this.mentionRange = null;
        this.updateMentionQuery('');
        this.mentionMenuActiveIndex = 0;
        this.changeDetectorRef.markForCheck();
        return true;
      }
      default:
        return false;
    }
  }

  private clampMentionMenuActiveIndex(): void {
    const optionCount = this.getMentionMenuOptions().length;

    if (optionCount === 0) {
      this.mentionMenuActiveIndex = 0;
      return;
    }

    if (this.mentionMenuActiveIndex >= optionCount || this.mentionMenuActiveIndex < 0) {
      this.mentionMenuActiveIndex = 0;
    }
  }

  private getMentionMenuOptions(): MentionMenuOption[] {
    const normalizedQuery = this.mentionQuery.trim().toLowerCase();
    const filteredSuggestions = !normalizedQuery
      ? this.mentionSuggestions
      : this.mentionSuggestions.filter((node) =>
          node.title.toLowerCase().includes(normalizedQuery),
        );

    const options: MentionMenuOption[] = [];
    const trimmedQuery = this.mentionQuery.trim();
    const canCreateNode =
      Boolean(trimmedQuery) &&
      !this.mentionSuggestions.some(
        (node) => node.title.trim().toLowerCase() === trimmedQuery.toLowerCase(),
      );

    if (canCreateNode) {
      options.push({
        kind: 'create',
        title: trimmedQuery,
      });
    }

    for (const node of filteredSuggestions) {
      options.push({
        kind: 'existing',
        node,
      });
    }

    return options;
  }

  protected onCreateMentionRequested(title: string): void {
    // We forward the request upward so the page container can create the stub node via API.
    this.createNodeRequested.emit(title);
  }

  private onMentionChipHover(event: Event): void {
    const hoverTarget = event.target as HTMLElement | null;
    const chip = hoverTarget?.closest('a.node-page-link') as HTMLElement | null;
    const nodeId = chip?.dataset['nodeId'];

    if (!chip || !nodeId || chip.classList.contains('is-loading-content')) {
      return;
    }

    const cachedContent = this.mentionContentCache.get(nodeId);

    if (cachedContent) {
      this.applyMentionContent(chip, cachedContent);
      return;
    }

    chip.classList.add('is-loading-content');
    chip.setAttribute('data-content-preview', 'Loading content...');

    const descriptionRequest = this.nodeApiService
      .loadNode(nodeId)
      .pipe(
        take(1),
        catchError((error) => {
          console.error('[NodeEditor] Failed to load mention content', error);
          return of(null as NodeResponse | null);
        }),
      )
      .subscribe((node) => {
        const contentPreview = node ? this.extractNodeContent(node) : 'Content unavailable.';
        this.mentionContentCache.set(nodeId, contentPreview);
        if (node?.isStub) {
          chip.classList.add('node-page-link-stub');
          chip.setAttribute('data-is-stub', 'true');
          this.mentionStubStateCache.set(nodeId, true);
        } else {
          chip.classList.remove('node-page-link-stub');
          chip.setAttribute('data-is-stub', 'false');
          this.mentionStubStateCache.set(nodeId, false);
        }
        this.applyMentionContent(chip, contentPreview);
      });

    this.hoverContentSubscriptions.add(descriptionRequest);
  }

  private applyMentionContent(chip: HTMLElement, contentPreview: string): void {
    chip.classList.remove('is-loading-content');
    chip.classList.add('has-content-preview');
    chip.setAttribute('data-content-preview', contentPreview);
  }

  private extractNodeContent(node: NodeResponse): string {
    const contentSnippet = this.extractTextSnippet(node.content, 220);

    if (contentSnippet) {
      return contentSnippet;
    }

    if (node.isStub) {
      return 'Empty Node';
    }

    return 'No content available.';
  }

  private extractTextSnippet(content: JSONContent | null | undefined, maxLength: number): string {
    if (!content) {
      return '';
    }

    const chunks: string[] = [];

    const visit = (node: JSONContent): void => {
      const nodeText = typeof node.text === 'string' ? node.text.trim() : '';

      if (nodeText) {
        chunks.push(nodeText);
      }

      // Include child node references so preview reflects linked context, not only plain text.
      if (node.type === 'knowledgeMention') {
        const attrs = (node.attrs ?? {}) as { title?: unknown };
        const mentionTitle = typeof attrs.title === 'string' ? attrs.title.trim() : '';

        if (mentionTitle) {
          chunks.push(`[${mentionTitle}]`);
        }
      }

      const children = Array.isArray(node.content) ? node.content : [];
      for (const child of children) {
        visit(child);
      }
    };

    visit(content);

    const joinedText = chunks.join(' ').replace(/\s+/g, ' ').trim();
    if (!joinedText) {
      return '';
    }

    if (joinedText.length <= maxLength) {
      return joinedText;
    }

    return `${joinedText.slice(0, maxLength - 1).trimEnd()}...`;
  }

  private updateMentionQuery(query: string): void {
    if (this.mentionQuery === query) {
      return;
    }

    this.mentionQuery = query;
    this.mentionMenuActiveIndex = 0;

    if (!query.trim()) {
      this.mentionSuggestions = [];
      return;
    }

    this.mentionQueryChanges$.next(query);
  }

  // Inserts the selected mock node reference and replaces the typed @query token.
  public selectMention(node: MentionNode): void {
    if (!this.mentionRange) {
      return;
    }

    this.editor
      .chain()
      .focus()
      .deleteRange(this.mentionRange)
      .insertKnowledgeMention({
        nodeId: node.id,
        title: node.title,
        isStub: Boolean(node.isStub),
      })
      .insertContent(' ')
      .run();

    this.mentionRange = null;
    this.updateMentionQuery('');
    this.onEditorStateChange();
  }

  // First slash command: switch into node-link mode by inserting @ and opening mention flow.
  protected runLinkNodeCommand(): void {
    if (!this.slashRange) {
      return;
    }

    this.editor.chain().focus().deleteRange(this.slashRange).insertContent('@').run();

    this.slashRange = null;
    this.onEditorStateChange();
  }

  // TipTap creates DOM/event subscriptions, so we destroy it when Angular tears down the component.
  ngOnDestroy(): void {
    this.mentionSuggestionsSubscription?.unsubscribe();
    this.hoverContentSubscriptions.unsubscribe();
    this.mentionMetadataSubscriptions.unsubscribe();
    this.mentionQueryChanges$.complete();
    this.editor.destroy();
  }

  protected toggleBold(): void {
    this.editor.chain().focus().toggleBold().run();
  }

  protected toggleItalic(): void {
    this.editor.chain().focus().toggleItalic().run();
  }

  protected toggleBulletList(): void {
    this.editor.chain().focus().toggleBulletList().run();
  }

  protected toggleHeading(): void {
    this.editor.chain().focus().toggleHeading({ level: 2 }).run();
  }

  protected toggleOrderedList(): void {
    this.editor.chain().focus().toggleOrderedList().run();
  }

  protected toggleCodeBlock(): void {
    this.editor.chain().focus().toggleCodeBlock().run();
  }
}
