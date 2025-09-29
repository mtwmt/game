import { Injectable, signal } from '@angular/core';
import {
  Cell,
  GameState,
  GameStatus,
  Difficulty,
  Position,
  MoveResult,
} from './minesweeper.interface';
import { getDifficultyConfigs } from './utils/minesweeper-config';
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
  initializeGame(difficulty: Difficulty = Difficulty.EXPERT): void {
    this.stopTimer();
    const difficultyConfigs = getDifficultyConfigs(this.isMobile, this.screenWidth, this.screenHeight);
    const config = difficultyConfigs[difficulty];

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
   * board[row][col] = board[y][x]
   * 標準二維陣列結構：第一維是行(row/y)，第二維是列(col/x)
   */
  private createEmptyBoard(width: number, height: number): Cell[][] {
    const board: Cell[][] = [];

    // 外層迴圈：行 (y 軸，從上到下)
    for (let y = 0; y < height; y++) {
      board[y] = [];
      // 內層迴圈：列 (x 軸，從左到右)
      for (let x = 0; x < width; x++) {
        board[y][x] = {
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
   * 直接修改傳入的 gameState，不更新 signal
   */
  private initializeMines(firstClickPosition: Position, gameState: GameState): void {
    const minePositions = MineGenerator.generateMinePositions(
      gameState.width,
      gameState.height,
      gameState.mineCount,
      firstClickPosition
    );

    // 在遊戲板上放置地雷
    minePositions.forEach(pos => {
      gameState.board[pos.y][pos.x].isMine = true;
    });

    // 計算每個格子的鄰近地雷數量
    MineGenerator.calculateNeighborMineCounts(
      gameState.board,
      gameState.width,
      gameState.height
    );
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

    const cell = currentState.board[position.y][position.x];

    if (!MinesweeperValidation.canRevealCell(cell)) {
      return { success: false, gameOver: false, cellsRevealed: [], gameStatus: currentState.gameStatus };
    }

    // 如果是第一次點擊，初始化地雷
    if (currentState.isFirstClick) {
      this.initializeMines(position, currentState);
      this.startTimer();
      currentState.gameStatus = GameStatus.PLAYING;
      currentState.isFirstClick = false;
    }

    const cellsRevealed = this.revealCellRecursive(position, currentState);

    // 檢查遊戲狀態
    if (MinesweeperValidation.checkGameOver(currentState.board[position.y][position.x])) {
      currentState.gameStatus = GameStatus.LOST;
      currentState.triggeredMinePosition = position; // 記錄觸發地雷位置
      this.stopTimer();
      this.revealAllMines(currentState);
    } else if (MinesweeperValidation.checkWinCondition(currentState)) {
      currentState.gameStatus = GameStatus.WON;
      this.stopTimer();
    }

    // 使用 signal.update() 觸發變更檢測
    // 只需要更新狀態，不需要深拷貝整個 board
    this.gameState.update(state => ({
      ...state,
      board: currentState.board,
      revealedCount: currentState.revealedCount,
      gameStatus: currentState.gameStatus,
      triggeredMinePosition: currentState.triggeredMinePosition
    }));

    return {
      success: true,
      gameOver: currentState.gameStatus !== GameStatus.PLAYING,
      cellsRevealed,
      gameStatus: currentState.gameStatus,
    };
  }

  /**
   * 遞歸揭開格子（空白區域展開）
   * 標準踩地雷邏輯：
   * 1. 揭開當前格子
   * 2. 如果當前格子是空白(0)，遞迴揭開所有鄰居
   * 3. 鄰居如果也是空白(0)，繼續遞迴；如果是數字則停止
   */
  private revealCellRecursive(position: Position, gameState: GameState): Position[] {
    const cell = gameState.board[position.y][position.x];
    const revealedPositions: Position[] = [];

    // 如果已揭開或已標記，直接返回
    if (cell.isRevealed || cell.isFlagged) {
      return revealedPositions;
    }

    // 揭開當前格子
    cell.isRevealed = true;
    gameState.revealedCount++;
    revealedPositions.push(position);

    // 如果是地雷，直接返回（遊戲結束由 revealCell 處理）
    if (cell.isMine) {
      return revealedPositions;
    }

    // 如果是空白格子（鄰近地雷數為0），遞歸揭開所有鄰近格子
    if (cell.neighborMineCount === 0) {
      const neighbors = MinesweeperValidation.getNeighborPositions(
        position,
        gameState.width,
        gameState.height
      );

      neighbors.forEach(neighborPos => {
        const neighborCell = gameState.board[neighborPos.y][neighborPos.x];
        if (!neighborCell.isRevealed && !neighborCell.isFlagged && !neighborCell.isMine) {
          // 遞迴展開鄰居
          // 如果鄰居是數字，會在下一層停止（因為 neighborMineCount > 0）
          // 如果鄰居是空白，會繼續遞迴展開
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

    const cell = currentState.board[position.y][position.x];

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

    // 使用 signal.update() 觸發變更檢測
    this.gameState.update(state => ({
      ...state,
      board: currentState.board,
      flaggedCount: currentState.flaggedCount
    }));
    return true;
  }

  /**
   * 揭開所有地雷（遊戲結束時）
   */
  private revealAllMines(gameState: GameState): void {
    for (let y = 0; y < gameState.height; y++) {
      for (let x = 0; x < gameState.width; x++) {
        const cell = gameState.board[y][x];
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
