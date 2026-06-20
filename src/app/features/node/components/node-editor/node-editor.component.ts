import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Editor, type JSONContent } from '@tiptap/core';
import { EditorState } from '@tiptap/pm/state';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import {
  TiptapBubbleMenuDirective,
  TiptapEditorDirective,
  TiptapFloatingMenuDirective
} from 'ngx-tiptap';
import { KnowledgeMention } from './knowledge-mention';
import { SaveNodePayload } from '../../models/node-save-payload.model';

type MentionNode = {
  id: string;
  title: string;
};

@Component({
  selector: 'app-node-editor',
  standalone: true,
  imports: [FormsModule, TiptapEditorDirective, TiptapBubbleMenuDirective, TiptapFloatingMenuDirective],
  templateUrl: './node-editor.component.html',
  styleUrl: './node-editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NodeEditorComponent implements OnChanges, OnDestroy {
  private slashRange: { from: number; to: number } | null = null;
  private mentionRange: { from: number; to: number } | null = null;

  @Input() initialTitle = '';
  @Input() initialContent: JSONContent = {
    type: 'doc',
    content: []
  };

  // The editor emits pure state changes; persistence is orchestrated by the page container.
  @Output() readonly nodeChange = new EventEmitter<SaveNodePayload>();

  // Title is stored separately from editor body so API payload matches backend contract.
  protected title = '';

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
        }
      })
    ],
    editorProps: {
      attributes: {
        class: 'notion-editor-content text-slate-800 focus:outline-none'
      }
    }
  });

  // Keeping the content as HTML makes it easy to send to the backend in MVP.
  protected content = '';

  // Mock data first, backend lookup later.
  protected readonly mentionSuggestions: MentionNode[] = [
    { id: 'node-subscription-lifecycle', title: 'Subscription Lifecycle' },
    { id: 'node-refund-policy', title: 'Refund Policy' },
    { id: 'node-billing-retry-logic', title: 'Billing Retry Logic' },
    { id: 'node-invoice-generation', title: 'Invoice Generation' },
    { id: 'node-retry-policy', title: 'Retry Policy' },
    { id: 'node-billing-service', title: 'Billing Service' }
  ];

  protected mentionQuery = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialTitle']) {
      this.title = this.initialTitle;
    }

    if (changes['initialContent'] && this.initialContent) {
      // Setting emitUpdate=false prevents autosave loops when data is loaded from the backend.
      this.editor.commands.setContent(this.initialContent, { emitUpdate: false });
    }
  }

  protected get filteredMentionSuggestions(): MentionNode[] {
    const query = this.mentionQuery.trim().toLowerCase();

    if (!query) {
      return this.mentionSuggestions;
    }

    return this.mentionSuggestions.filter((node) => node.title.toLowerCase().includes(query));
  }

  // This returns the exact shape expected by node create/update APIs.
  protected buildNodePayload(): SaveNodePayload {
    const content = this.editor.getJSON();
    const title = this.title.trim() || 'Untitled';

    return { title, content };
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
      to: from
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
      this.mentionQuery = '';
      return false;
    }

    const { $from } = state.selection;
    const textBeforeCursor = $from.parent.textBetween(0, $from.parentOffset, ' ', ' ');
    const mentionMatch = /(^|\s)@([^\s]*)$/.exec(textBeforeCursor);

    if (!mentionMatch) {
      this.mentionRange = null;
      this.mentionQuery = '';
      return false;
    }

    const rawMention = `@${mentionMatch[2]}`;
    this.mentionRange = {
      from: from - rawMention.length,
      to: from
    };
    this.mentionQuery = mentionMatch[2];

    return this.filteredMentionSuggestions.length > 0;
  };

  // Inserts the selected mock node reference and replaces the typed @query token.
  protected selectMention(node: MentionNode): void {
    if (!this.mentionRange) {
      return;
    }

    this.editor
      .chain()
      .focus()
      .deleteRange(this.mentionRange)
      .insertKnowledgeMention({
        nodeId: node.id,
        title: node.title
      })
      .insertContent(' ')
      .run();

    this.mentionRange = null;
    this.mentionQuery = '';
    this.onEditorStateChange();
  }

  // First slash command: switch into node-link mode by inserting @ and opening mention flow.
  protected runLinkNodeCommand(): void {
    if (!this.slashRange) {
      return;
    }

    this.editor
      .chain()
      .focus()
      .deleteRange(this.slashRange)
      .insertContent('@')
      .run();

    this.slashRange = null;
    this.onEditorStateChange();
  }

  // TipTap creates DOM/event subscriptions, so we destroy it when Angular tears down the component.
  ngOnDestroy(): void {
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
