import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LeftPanelComponent } from '../../../../core/layout/components/left-panel/left-panel.component';
import { RightPanelComponent } from '../../../../core/layout/components/right-panel/right-panel.component';
import { NodeEditorComponent } from '../../components/node-editor/node-editor.component';

@Component({
  selector: 'app-node-page',
  standalone: true,
  imports: [LeftPanelComponent, NodeEditorComponent, RightPanelComponent],
  templateUrl: './node-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NodePageComponent {}
