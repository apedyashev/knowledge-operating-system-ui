import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { MentionNode } from '#app/features/node/models/mention-node.model';

@Component({
  selector: 'app-mention-suggestions',
  standalone: true,
  templateUrl: './mention-suggestions.component.html',
  styleUrl: './mention-suggestions.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MentionSuggestionsComponent {
  @Input() suggestions: MentionNode[] = [];
  @Input() query = '';
  @Input() activeIndex = 0;

  @Output() readonly selectMention = new EventEmitter<MentionNode>();
  @Output() readonly createNode = new EventEmitter<string>();

  protected get filteredSuggestions(): MentionNode[] {
    const normalizedQuery = this.query.trim().toLowerCase();

    if (!normalizedQuery) {
      return this.suggestions;
    }

    return this.suggestions.filter((node) => node.title.toLowerCase().includes(normalizedQuery));
  }

  protected get canCreateNode(): boolean {
    const normalizedQuery = this.query.trim();

    if (!normalizedQuery) {
      return false;
    }

    return !this.suggestions.some((node) => node.title.trim().toLowerCase() === normalizedQuery.toLowerCase());
  }

  protected onSelect(node: MentionNode): void {
    this.selectMention.emit(node);
  }

  protected onCreateNode(): void {
    this.createNode.emit(this.query.trim());
  }

  protected getOptionIndexForMention(listIndex: number): number {
    return this.canCreateNode ? listIndex + 1 : listIndex;
  }
}