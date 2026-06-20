import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import {SearchField} from './components/search-field/search-field';
@Component({
  selector: 'app-layout-header',
  standalone: true,
  imports: [SearchField],
  templateUrl: './layout-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutHeaderComponent {
  
  @Output() newNodeClick = new EventEmitter<void>();

  onSearchChange(event: string): void {
     // TODO: not really needed at this level since search field handles its own state, but we can emit this up if we want to sync search state with URL or other components in the future.
  }

  // We keep the button logic outside this presentational component for reuse.
  onNewNodeClick(): void {
    this.newNodeClick.emit();
  }
}
