import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ModalComponent } from '../modal/modal.component';

export interface GameRule {
  title: string;
  rules: string[];
}

@Component({
  selector: 'app-game-header',
  standalone: true,
  imports: [CommonModule, RouterLink, ModalComponent],
  templateUrl: './game-header.html',
})
export class GameHeaderComponent {
  @Input() title: string = '';
  @Input() gameRules: GameRule | null = null;

  // 遊戲規則彈窗控制
  protected isGameRulesModalOpen = signal(false);

  // 打開遊戲規則彈窗
  openGameRulesModal(): void {
    this.isGameRulesModalOpen.set(true);
  }

  // 關閉遊戲規則彈窗
  closeGameRulesModal(): void {
    this.isGameRulesModalOpen.set(false);
  }
}
