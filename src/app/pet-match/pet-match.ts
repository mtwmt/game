import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, computed, PLATFORM_ID } from '@angular/core';
import { GameHeader } from '../shared/components/game-header/game-header';
import { Modal } from '../shared/components/modal/modal.component';
import { PetMatchService } from './pet-match.service';
import { Tile, PathSegment, GameStatus, LevelStatus, GameRule } from './pet-match.interface';
import { PET_EMOJIS, PET_COLORS, GAME_CONSTANTS } from './utils/pet-match-config';
import { PetMatchValidation } from './utils/pet-match-validation';
import { SeoService } from '../shared/services/seo.service';

@Component({
  selector: 'app-pet-match',
  imports: [CommonModule, GameHeader, Modal],
  templateUrl: './pet-match.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetMatch implements OnInit, OnDestroy {
  private petMatchService = inject(PetMatchService);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private seoService = inject(SeoService);

  // 從 service 獲取遊戲狀態
  protected readonly gameState = this.petMatchService.gameState;

  // 遊戲規則定義
  protected readonly gameRules: GameRule = {
    title: '寵物連連看遊戲規則',
    rules: [
      '點擊兩個相同的寵物圖案進行配對消除',
      '兩個圖案之間的連線最多只能有2個轉彎',
      '連線路徑不能被其他圖案阻擋',
      '成功配對後圖案會消除並獲得分數',
      '每關限時5分鐘，超時即遊戲結束',
      '消除所有圖案即可過關進入下一關',
      '不同關卡有不同的重力補位效果'
    ]
  };

  // UI 狀態
  protected readonly selectedTiles: Tile[] = [];
  protected readonly matchPath = computed(() => {
    // 從狀態中獲取路徑，需要另外處理
    return [] as PathSegment[];
  });
  protected readonly showPath = computed(() => false);

  // 寵物相關
  protected readonly petEmojis = PET_EMOJIS;

  // 格式化時間
  protected readonly formattedTime = computed(() => {
    return this.petMatchService.formatTime(this.gameState().gameTime);
  });

  // 倒數時間相關
  protected readonly formattedCountdown = computed(() => {
    const seconds = this.gameState().countdownTime;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  });

  protected readonly timelinePercentage = computed(() => {
    const maxTime = 300; // GAME_CONFIG.maxLevelTime
    return (this.gameState().countdownTime / maxTime * 100);
  });

  protected readonly timelineColorClass = computed(() => {
    if (this.gameState().countdownTime <= 30) return 'from-red-500 to-red-300';
    if (this.gameState().countdownTime <= 60) return 'from-yellow-500 to-yellow-300';
    return 'from-lime-500 to-lime-300';
  });

  protected readonly timelineTextClass = computed(() => {
    if (this.gameState().countdownTime <= 150) return 'text-white';
    return 'text-neutral-900/90';
  });

  // 道具剩餘次數
  protected readonly remainingShuffles = computed(() =>
    this.petMatchService.getRemainingShuffles()
  );

  protected readonly remainingHints = computed(() =>
    this.petMatchService.getRemainingHints()
  );

  // 從 gameState 派生的 computed 屬性（用於模板綁定）
  protected readonly board = computed(() => this.gameState().board);
  protected readonly score = computed(() => this.gameState().score);
  protected readonly level = computed(() => this.gameState().level);
  protected readonly moves = computed(() => this.gameState().moves);
  protected readonly remainingTiles = computed(() => this.gameState().remainingTiles);
  protected readonly totalShufflesUsed = computed(() => this.gameState().totalShufflesUsed);
  protected readonly totalHintsUsed = computed(() => this.gameState().totalHintsUsed);
  protected readonly maxShufflesPerGame = computed(() => this.gameState().maxShufflesPerGame);
  protected readonly maxHintsPerGame = computed(() => this.gameState().maxHintsPerGame);

  // 遊戲狀態檢查
  protected readonly gameOver = computed(() =>
    this.gameState().gameStatus === GameStatus.TIME_UP ||
    this.gameState().gameStatus === GameStatus.NO_MOVES
  );

  protected readonly levelComplete = computed(() =>
    this.gameState().levelStatus === LevelStatus.COMPLETED
  );

  protected readonly gameComplete = computed(() =>
    this.gameState().gameStatus === GameStatus.COMPLETE
  );

  protected readonly timeUp = computed(() =>
    this.gameState().gameStatus === GameStatus.TIME_UP
  );

  // 將 selectedTiles 變成一個 computed signal 供模板使用
  protected readonly selectedTilesSignal = computed(() => this.selectedTiles);

  private animationTimeout?: NodeJS.Timeout;
  private currentPath: PathSegment[] = [];
  protected showingPath = false;

  ngOnInit() {
    // 設定寵物連連看 SEO
    this.seoService.updateSeoTags({
      title: '寵物連連看',
      description: '可愛寵物連連看遊戲！找出相同的寵物圖案,用不超過3次轉彎的線連接消除。支援多種關卡和重力補位效果,考驗你的眼力和策略。免費線上玩,支援手機電腦！',
      keywords: '連連看,寵物連連看,益智遊戲,配對遊戲,消除遊戲,免費遊戲,線上遊戲,Match Game',
      type: 'game',
      url: 'https://mtwmt.com/game/pet-match',
      canonical: 'https://mtwmt.com/game/pet-match',
    });

    // 設置設備類型和螢幕尺寸
    if (this.isBrowser) {
      const isMobile = window.innerWidth <= 768;
      this.petMatchService.setDeviceType(isMobile, window.innerWidth, window.innerHeight);
    }

    this.petMatchService.initializeGame();
  }

  ngOnDestroy() {
    this.clearAnimationTimeout();
    this.petMatchService.cleanup();
  }

  private clearAnimationTimeout() {
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
    }
  }

  protected onTileClick(tile: Tile | null) {
    // 使用 validation 檢查是否可以點擊
    if (!PetMatchValidation.canClickTile(tile, this.gameState()) || this.showingPath) {
      return;
    }

    // TypeScript null 檢查：此時 tile 必定不為 null
    if (!tile) return;

    // 如果是提示中的方塊，隱藏提示
    if (PetMatchValidation.isHintTile(tile, this.gameState())) {
      this.petMatchService.hideHint();
    }

    // 如果方塊已選中，取消選擇
    if (tile.selected) {
      tile.selected = false;
      const index = this.selectedTiles.findIndex(t => t.id === tile.id);
      if (index !== -1) {
        this.selectedTiles.splice(index, 1);
      }
      return;
    }

    // 如果已有兩個選中，清除選擇
    if (this.selectedTiles.length >= 2) {
      this.clearSelection();
    }

    // 選中方塊
    tile.selected = true;
    this.selectedTiles.push(tile);

    // 如果選中兩個，檢查配對
    if (this.selectedTiles.length === 2) {
      this.checkMatch(this.selectedTiles[0], this.selectedTiles[1]);
    }
  }

  private checkMatch(tile1: Tile, tile2: Tile) {
    // 嘗試配對
    const result = this.petMatchService.attemptMatch(tile1, tile2);

    if (result.success && result.path) {
      // 顯示路徑動畫
      this.currentPath = result.path;
      this.showingPath = true;

      const executeAfterAnimation = () => {
        this.showingPath = false;
        this.currentPath = [];
        this.clearSelection();
      };

      if (this.isBrowser) {
        this.animationTimeout = setTimeout(executeAfterAnimation, GAME_CONSTANTS.PATH_ANIMATION_TIME);
      } else {
        executeAfterAnimation();
      }
    } else {
      // 配對失敗，短暫延遲後清除選擇
      if (this.isBrowser) {
        setTimeout(() => this.clearSelection(), GAME_CONSTANTS.SELECTION_CLEAR_TIME);
      } else {
        this.clearSelection();
      }
    }
  }

  private clearSelection() {
    this.selectedTiles.forEach(tile => (tile.selected = false));
    this.selectedTiles.length = 0;
  }

  protected nextLevel() {
    this.clearSelection();
    this.petMatchService.nextLevel();
  }

  protected resetGame() {
    this.clearSelection();
    this.clearAnimationTimeout();
    this.petMatchService.resetGame();
  }

  protected getTileClass(tile: Tile | null): string {
    if (!tile) return 'bg-stone-800 border border-stone-700';

    const baseClass =
      'bg-gradient-to-br border-2 cursor-pointer flex items-center justify-center text-2xl';

    if (tile.selected) {
      return `${baseClass} from-yellow-400 to-yellow-600 border-yellow-300 brightness-125`;
    }

    // 提示方塊的特殊效果
    if (this.isHintTile(tile)) {
      return `${baseClass} from-green-400 to-green-600 border-green-300 animate-pulse ring-2 ring-green-400 ring-opacity-75`;
    }

    return `${baseClass} ${PET_COLORS[tile.petType] || PET_COLORS[0]}`;
  }

  protected getPathStyle(segment: PathSegment): any {
    const cellSize = 48; // 方塊尺寸 (w-12 h-12 = 48px)
    const gap = 1; // 間距 (gap-[1px])
    const padding = 8; // 容器內邊距 (p-2 = 8px)

    // 計算格子位置（包含間距和內邊距）
    const startX = padding + segment.start.x * (cellSize + gap);
    const startY = padding + segment.start.y * (cellSize + gap);
    const endX = padding + segment.end.x * (cellSize + gap);
    const endY = padding + segment.end.y * (cellSize + gap);

    if (segment.direction === 'horizontal') {
      // 水平線：從左到右
      const left = Math.min(startX, endX) + cellSize / 2;
      const width = Math.abs(endX - startX);
      const top = startY + cellSize / 2 - 1; // -1 調整線的粗細居中

      return {
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: '2px',
        background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
        boxShadow: '0 0 8px #fbbf24, 0 0 8px #f59e0b',
        zIndex: 10,
      };
    } else {
      // 垂直線：從上到下
      const top = Math.min(startY, endY) + cellSize / 2;
      const height = Math.abs(endY - startY);
      const left = startX + cellSize / 2 - 1; // -1 調整線的粗細居中

      return {
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        width: '2px',
        height: `${height}px`,
        background: 'linear-gradient(180deg, #fbbf24, #f59e0b)',
        boxShadow: '0 0 8px #fbbf24, 0 0 16px #f59e0b',
        zIndex: 10,
      };
    }
  }

  protected shuffleTiles() {
    this.clearSelection();
    this.petMatchService.shuffleTiles();
  }

  protected canUseShuffle(): boolean {
    return PetMatchValidation.canUseShuffle(this.gameState());
  }

  protected useHint(): void {
    this.clearSelection();
    this.petMatchService.useHint();
  }

  protected hideHint(): void {
    this.petMatchService.hideHint();
  }

  protected canUseHint(): boolean {
    return PetMatchValidation.canUseHint(this.gameState());
  }

  protected isHintTile(tile: Tile | null): boolean {
    if (!tile) return false;
    return PetMatchValidation.isHintTile(tile, this.gameState());
  }

  // 獲取路徑用於顯示
  protected getDisplayPath(): PathSegment[] {
    return this.showingPath ? this.currentPath : [];
  }
}