import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';

import { KnowledgeSpaceSelectorComponent } from './components/knowledge-space-selector/knowledge-space-selector.component';
import { SearchField } from './components/search-field/search-field.component';
@Component({
  selector: 'app-layout-header',
  standalone: true,
  imports: [SearchField, KnowledgeSpaceSelectorComponent],
  templateUrl: './layout-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutHeaderComponent {
  @Output() newNodeClick = new EventEmitter<void>();

  // We keep the button logic outside this presentational component for reuse.
  onNewNodeClick(): void {
    this.newNodeClick.emit();
  }
}
