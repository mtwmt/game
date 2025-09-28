import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { RouterModule } from '@angular/router';
import { GameHeaderComponent, GameRule } from '../shared/components/game-header/game-header';

interface Game {
  title: string;
  description: string;
  route: string;
  emoji: string;
  color?: string; // 設為可選，將由函數自動計算
  difficulty: string;
  category?: 'action' | 'puzzle' | 'strategy'; // 新增遊戲類型
}

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterModule, GameHeaderComponent],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  // 自動顏色選擇邏輯
  private getGameColor(game: Game): string {
    // 如果已手動設定顏色，則優先使用
    if (game.color) {
      return game.color;
    }

    // 基於遊戲類型的顏色映射
    const categoryColors: Record<string, string> = {
      action: 'green', // 動作類：活力色彩
      puzzle: 'sky', // 智力類：理性色彩
      strategy: 'amber', // 策略類：深度思考色彩
    };

    if (game.category && categoryColors[game.category]) {
      return categoryColors[game.category];
    }

    // 預設顏色
    return 'gray';
  }

  // 遊戲中心規則說明
  protected readonly gameRules: GameRule = {
    title: '遊戲中心使用說明',
    rules: [
      '點擊任意遊戲卡片即可開始遊玩',
      '每個遊戲都有不同的難度等級和玩法',
      '所有遊戲都支援響應式設計，手機電腦都能玩',
      '遊戲進行中可隨時返回首頁選擇其他遊戲',
      '建議先查看各遊戲的規則說明再開始',
      '享受遊戲時光，挑戰你的極限！',
    ],
  };

  protected readonly games: Game[] = [
    {
      title: '寵物連連看',
      description: '找出相同的寵物並用不超過3次轉彎的線連接消除。可愛的寵物造型配合智慧路徑算法。',
      route: '/pet-match',
      emoji: '🐱',
      difficulty: '中等',
      category: 'puzzle',
    },
    {
      title: '踩地雷',
      description:
        '經典踩地雷遊戲，點擊格子避開隱藏的地雷。數字提示幫助你找出地雷位置，考驗邏輯推理能力。',
      route: '/minesweeper',
      emoji: '💣',
      difficulty: '中等',
      category: 'puzzle',
    },
    {
      title: '中國象棋',
      description:
        '經典中國象棋對戰，實現完整的象棋規則包含將帥、士象、車馬砲兵等所有棋子移動邏輯。',
      route: '/chinese-chess',
      emoji: '♟️',
      difficulty: '困難',
      category: 'strategy',
    },
    {
      title: '貪食蛇',
      description:
        '經典街機遊戲，控制貪食蛇吃掉食物，避免撞到自己或牆壁。考驗反應速度和策略規劃能力。',
      route: '/snake',
      emoji: '🐍',
      difficulty: '簡單',
      category: 'action',
    },
  ];

  // 提供給模板使用的顏色獲取方法
  getColor(game: Game): string {
    return this.getGameColor(game);
  }

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
