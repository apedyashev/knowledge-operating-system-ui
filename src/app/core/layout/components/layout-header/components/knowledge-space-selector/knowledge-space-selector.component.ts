import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { KnowledgeSpaceResult } from '#app/core/services/knowledge-space.service';
import { KnowledgeSpaceContextService } from '#app/core/services/knowledge-space-context.service';
import { IconComponent } from '#app/core/ui/components/icon/icon.component';

@Component({
  selector: 'app-knowledge-space-selector',
  standalone: true,
  imports: [AsyncPipe, IconComponent],
  templateUrl: './knowledge-space-selector.component.html',
  styleUrls: ['./knowledge-space-selector.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KnowledgeSpaceSelectorComponent {
  private readonly knowledgeSpaceContext = inject(KnowledgeSpaceContextService);

  // The component consumes the derived state; it does not know how API data and URL state are combined.
  protected readonly selectorState$ = this.knowledgeSpaceContext.selectorState$;
  protected isMenuOpen = false;

  protected toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  protected selectKnowledgeSpace(space: KnowledgeSpaceResult): void {
    this.isMenuOpen = false;
    this.knowledgeSpaceContext.selectSpace(space);
  }

  protected createKnowledgeSpace(): void {
    this.isMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.knowledge-space-selector')) {
      this.isMenuOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscapeKey(): void {
    this.isMenuOpen = false;
  }

  
}
