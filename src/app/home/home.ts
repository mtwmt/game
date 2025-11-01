import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { RouterModule } from '@angular/router';
import { GameHeader, GameRule } from '../shared/components/game-header/game-header';
import { SeoService } from '../shared/services/seo.service';

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
  imports: [CommonModule, RouterModule, GameHeader],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private seoService = inject(SeoService);

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
    // 設定首頁 SEO
    this.seoService.updateSeoTags({
      title: '線上小遊戲中心',
      description: '免費線上小遊戲平台,提供貪食蛇、寵物連連看、中國象棋、踩地雷等經典遊戲。支援電腦手機跨平台遊玩,無需下載即可開始。挑戰你的反應力、邏輯思維和策略規劃能力！',
      keywords: '線上遊戲,免費遊戲,小遊戲,貪食蛇,寵物連連看,中國象棋,踩地雷,益智遊戲,休閒遊戲,網頁遊戲,HTML5遊戲',
      type: 'website',
      url: 'https://mtwmt.com/game/',
      canonical: 'https://mtwmt.com/game/',
    });

    if (this.isBrowser) {
      this.loadGiscus();
    }
  }

  private loadGiscus() {
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', 'mtwmt/game');
    script.setAttribute('data-repo-id', 'R_kgDOPz6_7Q');
    script.setAttribute('data-category', 'General');
    script.setAttribute('data-category-id', 'DIC_kwDOPz6_7c4Cwrwj');
    script.setAttribute('data-mapping', 'pathname');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '1');
    script.setAttribute('data-input-position', 'top');
    script.setAttribute('data-theme', 'dark_tritanopia');
    script.setAttribute('data-lang', 'zh-TW');
    script.setAttribute('crossorigin', 'anonymous');
    script.setAttribute('async', '');

    const container = document.getElementById('comments');
    if (container) {
      container.appendChild(script);
    }
  }
}
