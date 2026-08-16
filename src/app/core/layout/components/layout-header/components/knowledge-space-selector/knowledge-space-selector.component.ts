import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { KnowledgeSpaceService, KnowledgeSpaceResult } from '#app/core/services/knowledge-space.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-knowledge-space-selector',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './knowledge-space-selector.component.html',
  styleUrls: ['./knowledge-space-selector.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KnowledgeSpaceSelectorComponent {
private readonly knowledgeSpacesService = inject(KnowledgeSpaceService);
  protected readonly knowledgeSpaces$ = this.knowledgeSpacesService.loadKnowledgeSpaces();
  protected selectedKnowledgeSpace: KnowledgeSpaceResult = { id: '', name: 'Select Knowledge Space' };
  protected isMenuOpen = false;

  protected toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  protected selectKnowledgeSpace(spaceId: string): void {
    this.knowledgeSpaces$.pipe(
      map(spaces => spaces.find(space => space.id === spaceId)  )
    ).subscribe(space => {
        if (space) {
          this.selectedKnowledgeSpace = space;
        }
        this.isMenuOpen = false;
    });
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
