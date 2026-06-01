import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-layout-header',
  standalone: true,
  templateUrl: './layout-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutHeaderComponent {
  @Output() searchChange = new EventEmitter<string>();
  @Output() newNodeClick = new EventEmitter<void>();

  // We emit text changes so parent containers can decide how search state is stored.
  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchChange.emit(input.value);
  }

  // We keep the button logic outside this presentational component for reuse.
  onNewNodeClick(): void {
    this.newNodeClick.emit();
  }
}
