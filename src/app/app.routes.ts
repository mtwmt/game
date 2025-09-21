import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'snake',
    loadComponent: () => import('./snake/snake').then((m) => m.Snake),
  },
  {
    path: '',
    redirectTo: 'snake',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'snake',
  },
];
