import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { RouterModule } from '@angular/router';

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
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
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
