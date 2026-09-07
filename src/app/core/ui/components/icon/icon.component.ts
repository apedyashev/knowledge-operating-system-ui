import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type AppIconName = 'chevron-down' | 'error-circle' | 'loading';

@Component({
  selector: 'app-icon',
  standalone: true,
  templateUrl: './icon.component.html',
  styleUrls: ['./icon.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  // The name makes the component reusable without repeating SVG markup in feature templates.
  @Input({ required: true }) name!: AppIconName;

  // The icon can be resized by the caller while keeping one shared SVG definition.
  @Input() size = '1rem';
}
