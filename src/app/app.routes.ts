import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'snake',
    loadComponent: () => import('./snake/snake').then((m) => m.Snake),
  },
  {
    path: 'pet-match',
    loadComponent: () => import('./pet-match/pet-match').then((m) => m.PetMatch),
  },
  {
    path: '',
    redirectTo: 'pet-match',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'pet-match',
  },
];
