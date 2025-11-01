import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, OnDestroy, OnInit, computed, inject } from '@angular/core';
import { GameHeader } from '../shared/components/game-header/game-header';
import { Modal } from '../shared/components/modal/modal.component';
import { SnakeService } from './snake.service';
import { Direction, GameStatus } from './snake.interface';
import { GAME_CONFIG, GAME_RULES, KEY_TO_DIRECTION } from './utils/snake-config';
import { SnakeValidation } from './utils/snake-validation';
import { SnakeLogic } from './utils/snake-logic';
import { SeoService } from '../shared/services/seo.service';

@Component({
  selector: 'app-snake',
  imports: [CommonModule, GameHeader, Modal],
  templateUrl: './snake.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Snake implements OnInit, OnDestroy {
  private snakeService = inject(SnakeService);
  private seoService = inject(SeoService);

  // 從 service 獲取遊戲狀態
  protected readonly gameState = this.snakeService.gameState;

  // 遊戲配置
  protected readonly boardSize = GAME_CONFIG.boardSize;
  protected readonly gameRules = GAME_RULES;

  // 計算屬性
  protected readonly snake = computed(() => this.gameState().snake);
  protected readonly food = computed(() => this.gameState().food);
  protected readonly direction = computed(() => this.gameState().direction);
  protected readonly score = computed(() => this.gameState().score);
  protected readonly gameStatus = computed(() => this.gameState().gameStatus);

  // 遊戲狀態檢查
  protected readonly gameOver = computed(() =>
    SnakeValidation.isGameOver(this.gameState().gameStatus)
  );
  protected readonly gameStarted = computed(() =>
    SnakeValidation.isGameStarted(this.gameState().gameStatus)
  );
  protected readonly isPaused = computed(() =>
    SnakeValidation.isPaused(this.gameState().gameStatus)
  );

  // 觸控控制
  private touchStartX = 0;
  private touchStartY = 0;

  ngOnInit() {
    // 設定貪食蛇 SEO
    this.seoService.updateSeoTags({
      title: '貪食蛇遊戲',
      description: '經典貪食蛇遊戲線上玩！控制貪食蛇吃掉食物,避免撞到自己或牆壁。支援鍵盤方向鍵和觸控操作,考驗你的反應速度和策略規劃。免費暢玩,無需下載！',
      keywords: '貪食蛇,貪食蛇遊戲,線上貪食蛇,Snake Game,經典遊戲,免費遊戲,益智遊戲,動作遊戲',
      type: 'game',
      url: 'https://mtwmt.com/game/snake',
      canonical: 'https://mtwmt.com/game/snake',
    });

    this.snakeService.initializeGame();
  }

  ngOnDestroy() {
    this.snakeService.cleanup();
  }

  /**
   * 鍵盤事件處理
   */
  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent) {
    const currentStatus = this.gameStatus();

    // 空白鍵控制
    if (event.key === ' ') {
      event.preventDefault();
      this.handleSpaceKey(currentStatus);
      return;
    }

    // 方向鍵控制（只在遊戲進行中有效）
    if (currentStatus !== GameStatus.PLAYING) {
      return;
    }

    const newDirection = KEY_TO_DIRECTION[event.key];
    if (newDirection) {
      event.preventDefault();
      this.snakeService.setDirection(newDirection);
    }
  }

  /**
   * 處理空白鍵
   */
  private handleSpaceKey(currentStatus: GameStatus): void {
    if (currentStatus === GameStatus.WAITING) {
      this.startGame();
    } else if (currentStatus === GameStatus.GAME_OVER) {
      this.resetGame();
    } else if (currentStatus === GameStatus.PLAYING || currentStatus === GameStatus.PAUSED) {
      this.togglePause();
    }
  }

  /**
   * 開始遊戲
   */
  protected startGame(): void {
    this.snakeService.startGame();
  }

  /**
   * 重置遊戲
   */
  protected resetGame(): void {
    this.snakeService.resetGame();
  }

  /**
   * 切換暫停
   */
  protected togglePause(): void {
    this.snakeService.togglePause();
  }

  /**
   * 獲取格子的 CSS 類別
   */
  protected getCellClass(x: number, y: number): string {
    const isSnakeHead =
      this.snake().length > 0 && this.snake()[0].x === x && this.snake()[0].y === y;
    const isSnakeBody = this.snake().some((segment) => segment.x === x && segment.y === y);
    const isFood = this.food().x === x && this.food().y === y;

    if (isSnakeHead) return 'bg-lime-400 border border-lime-600';
    if (isSnakeBody) return 'bg-lime-600 border border-lime-500';
    if (isFood) return 'bg-fuchsia-500 shadow-[0_0_6px_#c026d3,0_0_12px_#c026d3] animate-pulse';
    return 'bg-lime-900';
  }

  /**
   * 獲取棋盤陣列
   */
  protected getBoard(): number[] {
    return Array(this.boardSize * this.boardSize)
      .fill(0)
      .map((_, i) => i);
  }

  /**
   * 獲取行索引
   */
  protected getRow(index: number): number {
    return Math.floor(index / this.boardSize);
  }

  /**
   * 獲取列索引
   */
  protected getCol(index: number): number {
    return index % this.boardSize;
  }

  /**
   * 觸控開始
   */
  protected onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  }

  /**
   * 觸控移動
   */
  protected onTouchMove(event: TouchEvent): void {
    event.preventDefault();
  }

  /**
   * 觸控結束
   */
  protected onTouchEnd(event: TouchEvent): void {
    if (this.gameStatus() !== GameStatus.PLAYING) {
      return;
    }

    event.preventDefault();
    const touch = event.changedTouches[0];

    const swipeDirection = SnakeLogic.detectSwipeDirection(
      this.touchStartX,
      this.touchStartY,
      touch.clientX,
      touch.clientY,
      GAME_CONFIG.minSwipeDistance
    );

    if (swipeDirection) {
      this.snakeService.setDirection(swipeDirection);
    }
  }

  /**
   * 按鈕控制方向
   */
  protected changeDirection(newDirection: Direction): void {
    if (this.gameStatus() !== GameStatus.PLAYING) {
      return;
    }

    this.snakeService.setDirection(newDirection);
  }
}
