import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { GameState, GameStatus, Direction } from './snake.interface';
import { GAME_CONFIG, INITIAL_POSITIONS, INITIAL_DIRECTION } from './utils/snake-config';
import { SnakeValidation } from './utils/snake-validation';
import { SnakeLogic } from './utils/snake-logic';

/**
 * 初始遊戲狀態
 */
export const initialGameState: GameState = {
  snake: [{ ...INITIAL_POSITIONS.snake }],
  food: { ...INITIAL_POSITIONS.food },
  direction: INITIAL_DIRECTION,
  score: 0,
  gameStatus: GameStatus.WAITING,
  boardSize: GAME_CONFIG.boardSize,
};

@Injectable({
  providedIn: 'root',
})
export class SnakeService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  // 響應式遊戲狀態
  gameState = signal<GameState>({ ...initialGameState });

  // 遊戲循環計時器
  private gameTimer: number | null = null;

  /**
   * 初始化遊戲
   */
  initializeGame(): void {
    this.stopTimer();
    const newState: GameState = {
      ...initialGameState,
      snake: [{ ...INITIAL_POSITIONS.snake }],
      food: SnakeLogic.generateFoodPosition([INITIAL_POSITIONS.snake], GAME_CONFIG.boardSize),
    };
    this.gameState.set(newState);
  }

  /**
   * 開始遊戲
   */
  startGame(): void {
    const currentState = this.gameState();
    if (currentState.gameStatus !== GameStatus.WAITING) {
      return;
    }

    this.gameState.update(state => ({
      ...state,
      gameStatus: GameStatus.PLAYING,
    }));

    this.startTimer();
  }

  /**
   * 暫停遊戲
   */
  pauseGame(): void {
    const currentState = this.gameState();
    if (currentState.gameStatus !== GameStatus.PLAYING) {
      return;
    }

    this.gameState.update(state => ({
      ...state,
      gameStatus: GameStatus.PAUSED,
    }));

    this.stopTimer();
  }

  /**
   * 恢復遊戲
   */
  resumeGame(): void {
    const currentState = this.gameState();
    if (currentState.gameStatus !== GameStatus.PAUSED) {
      return;
    }

    this.gameState.update(state => ({
      ...state,
      gameStatus: GameStatus.PLAYING,
    }));

    this.startTimer();
  }

  /**
   * 切換暫停狀態
   */
  togglePause(): void {
    const currentState = this.gameState();
    if (currentState.gameStatus === GameStatus.PLAYING) {
      this.pauseGame();
    } else if (currentState.gameStatus === GameStatus.PAUSED) {
      this.resumeGame();
    }
  }

  /**
   * 重置遊戲
   */
  resetGame(): void {
    this.stopTimer();
    this.initializeGame();
  }

  /**
   * 設定移動方向
   */
  setDirection(newDirection: Direction): void {
    const currentState = this.gameState();

    // 只在遊戲進行中才能改變方向
    if (!SnakeValidation.canMove(currentState.gameStatus)) {
      return;
    }

    // 檢查方向是否有效（不能反向）
    if (!SnakeValidation.isValidDirection(currentState.direction, newDirection)) {
      return;
    }

    this.gameState.update(state => ({
      ...state,
      direction: newDirection,
    }));
  }

  /**
   * 執行移動（每個 tick 調用）
   */
  private moveSnake(): void {
    const currentState = this.gameState();

    if (!SnakeValidation.canMove(currentState.gameStatus)) {
      return;
    }

    // 執行移動
    const moveResult = SnakeLogic.executeMove(
      currentState.snake,
      currentState.direction,
      currentState.food,
      currentState.boardSize
    );

    if (!moveResult.success) {
      // 碰撞，遊戲結束
      this.gameState.update(state => ({
        ...state,
        gameStatus: GameStatus.GAME_OVER,
      }));
      this.stopTimer();
      return;
    }

    // 更新蛇的位置
    const updates: Partial<GameState> = {
      snake: moveResult.newSnake,
    };

    // 如果吃到食物
    if (moveResult.ateFood) {
      updates.score = currentState.score + GAME_CONFIG.scorePerFood;
      updates.food = SnakeLogic.generateFoodPosition(
        moveResult.newSnake,
        currentState.boardSize
      );
    }

    this.gameState.update(state => ({
      ...state,
      ...updates,
    }));
  }

  /**
   * 啟動遊戲計時器
   */
  private startTimer(): void {
    if (!this.isBrowser) {
      return;
    }

    this.stopTimer();
    this.gameTimer = window.setInterval(() => {
      this.moveSnake();
    }, GAME_CONFIG.gameSpeed);
  }

  /**
   * 停止遊戲計時器
   */
  private stopTimer(): void {
    if (this.gameTimer !== null) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }
  }

  /**
   * 清理資源
   */
  cleanup(): void {
    this.stopTimer();
  }
}
