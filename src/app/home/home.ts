import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { RouterModule } from '@angular/router';
import { GameHeaderComponent, GameRule } from '../shared/components/game-header/game-header';

interface Game {
  title: string;
  description: string;
  route: string;
  emoji: string;
  color: string;
  difficulty: string;
}

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterModule, GameHeaderComponent],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  // 遊戲中心規則說明
  protected readonly gameRules: GameRule = {
    title: '遊戲中心使用說明',
    rules: [
      '點擊任意遊戲卡片即可開始遊玩',
      '每個遊戲都有不同的難度等級和玩法',
      '所有遊戲都支援響應式設計，手機電腦都能玩',
      '遊戲進行中可隨時返回首頁選擇其他遊戲',
      '建議先查看各遊戲的規則說明再開始',
      '享受遊戲時光，挑戰你的極限！'
    ]
  };

  protected readonly games: Game[] = [
    {
      title: '貪食蛇',
      description: '經典街機遊戲，控制貪食蛇吃掉食物，避免撞到自己或牆壁。考驗反應速度和策略規劃能力。',
      route: '/snake',
      emoji: '🐍',
      color: 'green',
      difficulty: '簡單'
    },
    {
      title: '寵物連連看',
      description: '找出相同的寵物並用不超過3次轉彎的線連接消除。可愛的寵物造型配合智慧路徑算法。',
      route: '/pet-match',
      emoji: '🐱',
      color: 'pink',
      difficulty: '中等'
    },
    {
      title: '中國象棋',
      description: '經典中國象棋對戰，實現完整的象棋規則包含將帥、士象、車馬砲兵等所有棋子移動邏輯。',
      route: '/chinese-chess',
      emoji: '♟️',
      color: 'amber',
      difficulty: '困難'
    }
  ];

  ngOnInit() {
    if (this.isBrowser) {
      this.loadUtterances();
    }
  }

  private loadUtterances() {
    const script = document.createElement('script');
    script.src = 'https://utteranc.es/client.js';
    script.setAttribute('repo', 'mtwmt/game'); // 替換為你的 GitHub repo
    script.setAttribute('issue-term', 'pathname');
    script.setAttribute('theme', 'github-dark');
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;

    const container = document.getElementById('comments');
    if (container) {
      container.appendChild(script);
    }
  }
}
