import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-right-panel',
  standalone: true,
  templateUrl: './right-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RightPanelComponent {
  // These lists are temporary mock data so the context sidebar can be validated
  // before the backend graph and relationship endpoints are connected.
  protected readonly backlinks: string[] = [
    'Refund Policy',
    'Invoice Generation',
    'Billing Retry Logic',
  ];

  protected readonly relatedNodes: string[] = ['Billing Service', 'Retry Policy', 'Payment Events'];

  protected readonly metadata = {
    type: 'Concept',
    updatedAt: '2h ago',
    owner: 'Platform Team',
  };
}
