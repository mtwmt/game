import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home').then((m) => m.Home),
    title: 'Game - Home',
  },
  {
    path: 'snake',
    loadComponent: () => import('./snake/snake').then((m) => m.Snake),
    title: 'Game - Snake',
  },
  {
    path: 'pet-match',
    loadComponent: () => import('./pet-match/pet-match').then((m) => m.PetMatch),
    title: 'Game - Pet Connect',
  },
  {
    path: 'chinese-chess',
    loadComponent: () => import('./chinese-chess/chinese-chess').then((m) => m.ChineseChess),
    title: 'Game - Chinese Chess',
  },
  {
    path: 'minesweeper',
    loadComponent: () => import('./minesweeper/minesweeper').then((m) => m.Minesweeper),
    title: 'Game - Minesweeper',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
