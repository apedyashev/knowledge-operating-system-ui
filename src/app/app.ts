import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LayoutHeaderComponent } from './core/layout/components/layout-header/layout-header.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LayoutHeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('kos-ui');
}
