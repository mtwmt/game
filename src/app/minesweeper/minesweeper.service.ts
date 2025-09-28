import { Injectable, signal } from '@angular/core';
import {
  Cell,
  GameState,
  GameStatus,
  Difficulty,
  Position,
  MoveResult,
} from './minesweeper.interface';
import { DIFFICULTY_CONFIGS } from './utils/minesweeper-config';
import { MinesweeperValidation } from './utils/minesweeper-validation';
import { MineGenerator } from './utils/minesweeper-mine-generator';

export const initialGameState: GameState = {
  board: [],
  width: 9,
  height: 9,
  mineCount: 10,
  revealedCount: 0,
  flaggedCount: 0,
  gameStatus: GameStatus.WAITING,
  gameTime: 0,
  isFirstClick: true,
  difficulty: Difficulty.EXPERT,
};

@Injectable({
  providedIn: 'root',
})
export class MinesweeperService {
  // 使用 signal 進行響應式狀態管理
  gameState = signal<GameState>({ ...initialGameState });

  private gameTimer: number | null = null;

  /**
   * 初始化新遊戲
   */
  initializeGame(difficulty: Difficulty = Difficulty.EXPERT): void {
    this.stopTimer();
    const config = DIFFICULTY_CONFIGS[difficulty];

    if (!MinesweeperValidation.isValidGameConfig(config.width, config.height, config.mineCount)) {
      console.error('Invalid game configuration');
      return;
    }

    const newState: GameState = {
      ...initialGameState,
      width: config.width,
      height: config.height,
      mineCount: config.mineCount,
      difficulty,
      board: this.createEmptyBoard(config.width, config.height),
    };

    this.gameState.set(newState);
  }

  /**
   * 創建空的遊戲板
   */
  private createEmptyBoard(width: number, height: number): Cell[][] {
    const board: Cell[][] = [];

    for (let x = 0; x < width; x++) {
      board[x] = [];
      for (let y = 0; y < height; y++) {
        board[x][y] = {
          position: { x, y },
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          neighborMineCount: 0,
          id: `cell-${x}-${y}`,
        };
      }
    }

    return board;
  }

  /**
   * 初始化地雷（在第一次點擊後）
   */
  private initializeMines(firstClickPosition: Position): void {
    const currentState = this.gameState();
    const minePositions = MineGenerator.generateMinePositions(
      currentState.width,
      currentState.height,
      currentState.mineCount,
      firstClickPosition
    );

    // 在遊戲板上放置地雷
    minePositions.forEach(pos => {
      currentState.board[pos.x][pos.y].isMine = true;
    });

    // 計算每個格子的鄰近地雷數量
    MineGenerator.calculateNeighborMineCounts(
      currentState.board,
      currentState.width,
      currentState.height
    );

    this.gameState.set({ ...currentState });
  }

  /**
   * 揭開格子
   */
  revealCell(position: Position): MoveResult {
    const currentState = this.gameState();

    if (!MinesweeperValidation.canMakeMove(currentState)) {
      return { success: false, gameOver: false, cellsRevealed: [], gameStatus: currentState.gameStatus };
    }

    if (!MinesweeperValidation.isValidPosition(position, currentState.width, currentState.height)) {
      return { success: false, gameOver: false, cellsRevealed: [], gameStatus: currentState.gameStatus };
    }

    const cell = currentState.board[position.x][position.y];

    if (!MinesweeperValidation.canRevealCell(cell)) {
      return { success: false, gameOver: false, cellsRevealed: [], gameStatus: currentState.gameStatus };
    }

    // 如果是第一次點擊，初始化地雷
    if (currentState.isFirstClick) {
      this.initializeMines(position);
      this.startTimer();
      currentState.gameStatus = GameStatus.PLAYING;
      currentState.isFirstClick = false;
    }

    const cellsRevealed = this.revealCellRecursive(position, currentState);

    // 檢查遊戲狀態
    if (MinesweeperValidation.checkGameOver(currentState.board[position.x][position.y])) {
      currentState.gameStatus = GameStatus.LOST;
      this.stopTimer();
      this.revealAllMines(currentState);
    } else if (MinesweeperValidation.checkWinCondition(currentState)) {
      currentState.gameStatus = GameStatus.WON;
      this.stopTimer();
    }

    this.gameState.set({ ...currentState });

    return {
      success: true,
      gameOver: currentState.gameStatus !== GameStatus.PLAYING,
      cellsRevealed,
      gameStatus: currentState.gameStatus,
    };
  }

  /**
   * 遞歸揭開格子（空白區域展開）
   */
  private revealCellRecursive(position: Position, gameState: GameState): Position[] {
    const cell = gameState.board[position.x][position.y];
    const revealedPositions: Position[] = [];

    if (cell.isRevealed || cell.isFlagged) {
      return revealedPositions;
    }

    // 揭開當前格子
    cell.isRevealed = true;
    gameState.revealedCount++;
    revealedPositions.push(position);

    // 如果是空白格子（鄰近地雷數為0），遞歸揭開鄰近格子
    if (!cell.isMine && cell.neighborMineCount === 0) {
      const neighbors = MinesweeperValidation.getNeighborPositions(
        position,
        gameState.width,
        gameState.height
      );

      neighbors.forEach(neighborPos => {
        const neighborCell = gameState.board[neighborPos.x][neighborPos.y];
        if (!neighborCell.isRevealed && !neighborCell.isFlagged) {
          const neighborRevealed = this.revealCellRecursive(neighborPos, gameState);
          revealedPositions.push(...neighborRevealed);
        }
      });
    }

    return revealedPositions;
  }

  /**
   * 切換旗標狀態
   */
  toggleFlag(position: Position): boolean {
    const currentState = this.gameState();

    if (!MinesweeperValidation.canMakeMove(currentState)) {
      return false;
    }

    if (!MinesweeperValidation.isValidPosition(position, currentState.width, currentState.height)) {
      return false;
    }

    const cell = currentState.board[position.x][position.y];

    if (!MinesweeperValidation.canToggleFlag(cell)) {
      return false;
    }

    if (cell.isFlagged) {
      cell.isFlagged = false;
      currentState.flaggedCount--;
    } else {
      // 檢查旗標數量限制
      if (MinesweeperValidation.isValidFlagCount(currentState.flaggedCount + 1, currentState.mineCount)) {
        cell.isFlagged = true;
        currentState.flaggedCount++;
      } else {
        return false; // 旗標數量已達上限
      }
    }

    this.gameState.set({ ...currentState });
    return true;
  }

  /**
   * 揭開所有地雷（遊戲結束時）
   */
  private revealAllMines(gameState: GameState): void {
    for (let x = 0; x < gameState.width; x++) {
      for (let y = 0; y < gameState.height; y++) {
        const cell = gameState.board[x][y];
        if (cell.isMine) {
          cell.isRevealed = true;
        }
      }
    }
  }

  /**
   * 開始計時器
   */
  private startTimer(): void {
    this.gameTimer = window.setInterval(() => {
      const currentState = this.gameState();
      currentState.gameTime++;
      this.gameState.set({ ...currentState });
    }, 1000);
  }

  /**
   * 停止計時器
   */
  private stopTimer(): void {
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }
  }

  /**
   * 重置遊戲
   */
  resetGame(): void {
    const currentDifficulty = this.gameState().difficulty;
    this.initializeGame(currentDifficulty);
  }

  /**
   * 設置難度
   */
  setDifficulty(difficulty: Difficulty): void {
    this.initializeGame(difficulty);
  }

  /**
   * 自訂遊戲設定
   */
  setCustomGame(width: number, height: number, mineCount: number): void {
    if (!MinesweeperValidation.isValidGameConfig(width, height, mineCount)) {
      console.error('Invalid custom game configuration');
      return;
    }

    this.stopTimer();

    const newState: GameState = {
      ...initialGameState,
      width,
      height,
      mineCount,
      difficulty: Difficulty.CUSTOM,
      board: this.createEmptyBoard(width, height),
    };

    this.gameState.set(newState);
  }

  /**
   * 獲取剩餘地雷數量
   */
  getRemainingMineCount(): number {
    const currentState = this.gameState();
    return currentState.mineCount - currentState.flaggedCount;
  }

  /**
   * 清理資源
   */
  cleanup(): void {
    this.stopTimer();
  }
}
