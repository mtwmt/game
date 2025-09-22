import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Guideline } from './guideline/guideline';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Guideline],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('game');

  year = new Date().getFullYear();
}
