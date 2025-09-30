import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  GameState,
  GameStatus,
  LevelStatus,
  Tile,
  Position,
  PathSegment,
  MatchResult,
} from './pet-match.interface';
import { GAME_CONFIG, GAME_CONSTANTS, getLevelType, getGameConfig } from './utils/pet-match-config';
import { PetMatchLogic } from './utils/pet-match-logic';
import { PetMatchPathfinding } from './utils/pet-match-pathfinding';
import { PetMatchValidation } from './utils/pet-match-validation';

export const initialGameState: GameState = {
  board: [],
  width: GAME_CONFIG.width,
  height: GAME_CONFIG.height,
  petTypes: GAME_CONFIG.petTypes,
  score: 0,
  level: 1,
  moves: 0,
  remainingTiles: 0,
  gameStatus: GameStatus.WAITING,
  levelStatus: LevelStatus.PLAYING,
  gameTime: 0,
  countdownTime: GAME_CONFIG.maxLevelTime,
  totalShufflesUsed: 0,
  totalHintsUsed: 0,
  maxShufflesPerGame: GAME_CONSTANTS.MAX_SHUFFLES_PER_GAME,
  maxHintsPerGame: GAME_CONSTANTS.MAX_HINTS_PER_GAME,
  hintTiles: [],
  showHint: false,
};

@Injectable({
  providedIn: 'root',
})
export class PetMatchService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  // 使用 signal 進行響應式狀態管理
  gameState = signal<GameState>({ ...initialGameState });

  private logic = new PetMatchLogic();
  private pathfinding = new PetMatchPathfinding();

  private gameTimer: number | null = null;
  private countdownTimer: number | null = null;
  private levelStartTime: number = 0;
  private isMobile: boolean = false;
  private screenWidth: number = 0;
  private screenHeight: number = 0;

  /**
   * 設置設備類型和螢幕尺寸
   */
  setDeviceType(isMobile: boolean, screenWidth?: number, screenHeight?: number): void {
    this.isMobile = isMobile;
    this.screenWidth = screenWidth || 0;
    this.screenHeight = screenHeight || 0;
  }

  /**
   * 初始化新遊戲
   */
  initializeGame(): void {
    this.stopAllTimers();

    // 根據裝置類型獲取配置
    const config = getGameConfig(this.isMobile, this.screenWidth, this.screenHeight);

    const board = this.logic.initializeBoard(
      config.width,
      config.height,
      config.petTypes
    );

    const newState: GameState = {
      ...initialGameState,
      width: config.width,
      height: config.height,
      petTypes: config.petTypes,
      board,
      remainingTiles: this.logic.getRemainingTileCount(board),
      gameStatus: GameStatus.PLAYING,
      countdownTime: config.maxLevelTime,
    };

    this.gameState.set(newState);
    this.startLevelTimer();
  }

  /**
   * 重置遊戲（回到第一關）
   */
  resetGame(): void {
    this.stopAllTimers();

    // 根據裝置類型獲取配置
    const config = getGameConfig(this.isMobile, this.screenWidth, this.screenHeight);

    const board = this.logic.initializeBoard(
      config.width,
      config.height,
      config.petTypes
    );

    const newState: GameState = {
      ...initialGameState,
      width: config.width,
      height: config.height,
      petTypes: config.petTypes,
      board,
      remainingTiles: this.logic.getRemainingTileCount(board),
      gameStatus: GameStatus.PLAYING,
      countdownTime: config.maxLevelTime,
    };

    this.gameState.set(newState);
    this.startLevelTimer();
  }

  /**
   * 進入下一關
   */
  nextLevel(): void {
    const currentState = this.gameState();

    if (currentState.level >= GAME_CONSTANTS.MAX_LEVELS) {
      // 已經完成所有關卡
      return;
    }

    this.stopAllTimers();

    // 根據裝置類型獲取配置（保持當前配置）
    const config = getGameConfig(this.isMobile, this.screenWidth, this.screenHeight);

    const board = this.logic.initializeBoard(
      config.width,
      config.height,
      config.petTypes
    );

    const newState: GameState = {
      ...currentState,
      width: config.width,
      height: config.height,
      petTypes: config.petTypes,
      board,
      level: currentState.level + 1,
      moves: 0,
      remainingTiles: this.logic.getRemainingTileCount(board),
      gameStatus: GameStatus.PLAYING,
      levelStatus: LevelStatus.PLAYING,
      gameTime: 0,
      countdownTime: config.maxLevelTime,
      hintTiles: [],
      showHint: false,
      // 道具次數不重置，延續到下一關
    };

    this.gameState.set(newState);
    this.startLevelTimer();
  }

  /**
   * 嘗試配對兩個方塊
   */
  attemptMatch(tile1: Tile, tile2: Tile): MatchResult {
    const currentState = this.gameState();

    // 使用 validation 檢查遊戲狀態
    if (!PetMatchValidation.canMakeMove(currentState)) {
      return { success: false, path: null, tile1, tile2 };
    }

    // 使用 validation 檢查是否可以配對
    if (!PetMatchValidation.canMatch(tile1, tile2)) {
      return { success: false, path: null, tile1, tile2 };
    }

    // 尋找路徑
    const path = this.pathfinding.findPath(
      tile1.position,
      tile2.position,
      currentState.board,
      currentState.width,
      currentState.height
    );

    if (!path) {
      return { success: false, path: null, tile1, tile2 };
    }

    // 配對成功，移除方塊
    this.logic.removeTiles(currentState.board, tile1, tile2);

    // 根據關卡類型應用重力效果
    this.applyLevelGravity(currentState);

    // 更新狀態
    currentState.score += GAME_CONSTANTS.MATCH_SCORE;
    currentState.moves++;
    currentState.remainingTiles = this.logic.getRemainingTileCount(currentState.board);

    // 使用 validation 檢查關卡是否完成
    if (PetMatchValidation.isLevelComplete(currentState)) {
      currentState.levelStatus = LevelStatus.COMPLETED;

      // 檢查是否全部破關
      if (currentState.level >= GAME_CONSTANTS.MAX_LEVELS) {
        currentState.gameStatus = GameStatus.COMPLETE;
      }

      this.stopAllTimers();
    } else {
      // 檢查是否還有可用移動
      if (!this.logic.hasValidMoves(currentState.board, currentState.width, currentState.height, this.pathfinding)) {
        // 如果還有重排次數，自動重排
        if (PetMatchValidation.canUseShuffle(currentState)) {
          this.shuffleTiles();
        } else {
          currentState.gameStatus = GameStatus.NO_MOVES;
          currentState.levelStatus = LevelStatus.FAILED;
          this.stopAllTimers();
        }
      }
    }

    this.gameState.set({ ...currentState });

    return { success: true, path, tile1, tile2 };
  }

  /**
   * 重排方塊
   */
  shuffleTiles(): void {
    const currentState = this.gameState();

    // 使用 validation 檢查是否可以重排
    if (!PetMatchValidation.canUseShuffle(currentState)) {
      return;
    }

    // 收集所有非空方塊的寵物類型
    const petTypes: number[] = [];
    for (let y = 0; y < currentState.height; y++) {
      for (let x = 0; x < currentState.width; x++) {
        if (currentState.board[y][x]) {
          petTypes.push(currentState.board[y][x]!.petType);
        }
      }
    }

    // 洗牌
    for (let i = petTypes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [petTypes[i], petTypes[j]] = [petTypes[j], petTypes[i]];
    }

    // 重新分配
    let petIndex = 0;
    let id = Date.now();

    for (let y = 0; y < currentState.height; y++) {
      for (let x = 0; x < currentState.width; x++) {
        if (currentState.board[y][x]) {
          currentState.board[y][x] = {
            id: id++,
            petType: petTypes[petIndex++],
            position: { x, y },
            selected: false,
          };
        }
      }
    }

    currentState.totalShufflesUsed++;
    this.gameState.set({ ...currentState });

    // 重排後再次檢查是否有可用移動
    if (!this.logic.hasValidMoves(currentState.board, currentState.width, currentState.height, this.pathfinding)) {
      if (PetMatchValidation.canUseShuffle(currentState)) {
        // 如果還有重排次數，再次重排
        this.shuffleTiles();
      } else {
        // 沒有可用移動且無法重排
        currentState.gameStatus = GameStatus.NO_MOVES;
        currentState.levelStatus = LevelStatus.FAILED;
        this.stopAllTimers();
        this.gameState.set({ ...currentState });
      }
    }
  }

  /**
   * 使用提示
   */
  useHint(): void {
    const currentState = this.gameState();

    // 使用 validation 檢查是否可以使用提示
    if (!PetMatchValidation.canUseHint(currentState)) {
      return;
    }

    const pair = this.logic.findValidPair(
      currentState.board,
      currentState.width,
      currentState.height,
      this.pathfinding
    );

    if (pair) {
      currentState.hintTiles = [pair.tile1, pair.tile2];
      currentState.showHint = true;
      currentState.totalHintsUsed++;
      this.gameState.set({ ...currentState });
    }
  }

  /**
   * 隱藏提示
   */
  hideHint(): void {
    const currentState = this.gameState();
    currentState.hintTiles = [];
    currentState.showHint = false;
    this.gameState.set({ ...currentState });
  }

  /**
   * 根據關卡類型應用重力效果
   */
  private applyLevelGravity(gameState: GameState): void {
    const levelType = getLevelType(gameState.level);

    switch (levelType) {
      case 'classic':
        // 不補位
        break;
      case 'down':
        this.logic.collapseBoardDown(gameState.board, gameState.width, gameState.height);
        break;
      case 'up':
        this.logic.collapseBoardUp(gameState.board, gameState.width, gameState.height);
        break;
      case 'left':
        this.logic.collapseBoardLeft(gameState.board, gameState.width, gameState.height);
        break;
      case 'right':
        this.logic.collapseBoardRight(gameState.board, gameState.width, gameState.height);
        break;
    }
  }

  /**
   * 開始關卡計時器
   */
  private startLevelTimer(): void {
    if (!this.isBrowser) return;

    this.levelStartTime = Date.now();

    // 經過時間計時器
    this.gameTimer = window.setInterval(() => {
      const currentState = this.gameState();
      currentState.gameTime = this.logic.getElapsedTime(this.levelStartTime);
      this.gameState.set({ ...currentState });
    }, GAME_CONSTANTS.TIMER_INTERVAL);

    // 倒數計時器
    this.countdownTimer = window.setInterval(() => {
      const currentState = this.gameState();
      const elapsed = this.logic.getElapsedTime(this.levelStartTime);
      const remaining = Math.max(0, GAME_CONFIG.maxLevelTime - elapsed);
      currentState.countdownTime = remaining;

      if (remaining <= 0) {
        currentState.gameStatus = GameStatus.TIME_UP;
        currentState.levelStatus = LevelStatus.FAILED;
        this.stopAllTimers();
      }

      this.gameState.set({ ...currentState });
    }, GAME_CONSTANTS.TIMER_INTERVAL);
  }

  /**
   * 停止所有計時器
   */
  private stopAllTimers(): void {
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  /**
   * 獲取剩餘重排次數
   */
  getRemainingShuffles(): number {
    const state = this.gameState();
    return state.maxShufflesPerGame - state.totalShufflesUsed;
  }

  /**
   * 獲取剩餘提示次數
   */
  getRemainingHints(): number {
    const state = this.gameState();
    return state.maxHintsPerGame - state.totalHintsUsed;
  }

  /**
   * 格式化時間
   */
  formatTime(seconds: number): string {
    return this.logic.formatTime(seconds);
  }

  /**
   * 清理資源
   */
  cleanup(): void {
    this.stopAllTimers();
  }
}