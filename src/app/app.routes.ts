import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: ':space/node',
		loadComponent: () =>
			import('./features/node/pages/node-page/node-page.component').then(
				(m) => m.NodePageComponent
			)
	},
	{
		path: ':space/node/:id',
		loadComponent: () =>
			import('./features/node/pages/node-page/node-page.component').then(
				(m) => m.NodePageComponent
			)
	}
];
