import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home').then((m) => m.Home),
  },
  {
    path: 'snake',
    loadComponent: () => import('./snake/snake').then((m) => m.Snake),
  },
  {
    path: 'pet-match',
    loadComponent: () => import('./pet-match/pet-match').then((m) => m.PetMatch),
  },
  {
    path: 'chinese-chess',
    loadComponent: () => import('./chinese-chess/chinese-chess').then((m) => m.ChineseChess),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
