import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: 'node',
		loadComponent: () =>
			import('./features/node/pages/node-page/node-page.component').then(
				(m) => m.NodePageComponent
			)
	},
	{
		path: 'node/:id',
		loadComponent: () =>
			import('./features/node/pages/node-page/node-page.component').then(
				(m) => m.NodePageComponent
			)
	}
];
