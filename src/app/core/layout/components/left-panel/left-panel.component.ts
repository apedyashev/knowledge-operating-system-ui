import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-left-panel',
  standalone: true,
  templateUrl: './left-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LeftPanelComponent {
  // These arrays are temporary mock data so the left navigation can be built
  // before the backend APIs and store integration are implemented.
  protected readonly recentNodes: string[] = [
    'Billing',
    'Refunds',
    'Retry Logic',
    'Invoice Generation'
  ];

  protected readonly tags: string[] = ['billing', 'payments', 'architecture', 'ops'];

  protected readonly filters: string[] = ['Concept', 'Business Rule', 'Process'];
}
