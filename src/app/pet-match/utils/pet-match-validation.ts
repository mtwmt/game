import { Position, Tile, GameState, GameStatus, LevelStatus } from '../pet-match.interface';
import { GAME_CONFIG, GAME_CONSTANTS } from './pet-match-config';

/**
 * 寵物連連看驗證工具類
 * 提供遊戲狀態和操作的各種驗證方法
 */
export class PetMatchValidation {
  /**
   * 檢查位置是否在遊戲板範圍內
   */
  static isValidPosition(position: Position, width: number, height: number): boolean {
    return position.x >= 0 && position.x < width && position.y >= 0 && position.y < height;
  }

  /**
   * 檢查遊戲配置是否有效
   */
  static isValidGameConfig(width: number, height: number, petTypes: number): boolean {
    const totalCells = width * height;

    // 檢查棋盤尺寸
    if (width <= 0 || height <= 0) {
      return false;
    }

    // 檢查寵物類型數量
    if (petTypes <= 0 || petTypes > 18) { // 最多支援 18 種寵物
      return false;
    }

    // 檢查總格子數必須是偶數（配對遊戲需求）
    if (totalCells % 2 !== 0) {
      return false;
    }

    // 檢查每種寵物至少有一對
    if (totalCells / 2 < petTypes) {
      return false;
    }

    return true;
  }

  /**
   * 檢查是否可以進行遊戲操作
   */
  static canMakeMove(gameState: GameState): boolean {
    return (
      gameState.gameStatus === GameStatus.PLAYING &&
      gameState.levelStatus === LevelStatus.PLAYING
    );
  }

  /**
   * 檢查方塊是否可以被點擊
   */
  static canClickTile(tile: Tile | null, gameState: GameState): boolean {
    // 方塊不存在
    if (!tile) {
      return false;
    }

    // 遊戲狀態不允許操作
    if (!this.canMakeMove(gameState)) {
      return false;
    }

    return true;
  }

  /**
   * 檢查兩個方塊是否可以配對
   */
  static canMatch(tile1: Tile, tile2: Tile): boolean {
    // 不能是同一個方塊
    if (tile1.id === tile2.id) {
      return false;
    }

    // 必須是相同類型
    if (tile1.petType !== tile2.petType) {
      return false;
    }

    return true;
  }

  /**
   * 檢查關卡是否完成
   */
  static isLevelComplete(gameState: GameState): boolean {
    return gameState.remainingTiles === 0;
  }

  /**
   * 檢查遊戲是否結束（時間到或無可用移動）
   */
  static isGameOver(gameState: GameState): boolean {
    return (
      gameState.gameStatus === GameStatus.TIME_UP ||
      gameState.gameStatus === GameStatus.NO_MOVES
    );
  }

  /**
   * 檢查是否全部破關
   */
  static isGameComplete(gameState: GameState): boolean {
    return gameState.gameStatus === GameStatus.COMPLETE;
  }

  /**
   * 檢查是否還有剩餘時間
   */
  static hasTimeRemaining(gameState: GameState): boolean {
    return gameState.countdownTime > 0;
  }

  /**
   * 檢查關卡等級是否有效
   */
  static isValidLevel(level: number): boolean {
    return level >= 1 && level <= GAME_CONSTANTS.MAX_LEVELS;
  }

  /**
   * 檢查是否可以使用重排道具
   */
  static canUseShuffle(gameState: GameState): boolean {
    return (
      gameState.totalShufflesUsed < gameState.maxShufflesPerGame &&
      gameState.gameStatus === GameStatus.PLAYING &&
      gameState.remainingTiles > 0 &&
      this.hasTimeRemaining(gameState)
    );
  }

  /**
   * 檢查是否可以使用提示道具
   */
  static canUseHint(gameState: GameState): boolean {
    return (
      gameState.totalHintsUsed < gameState.maxHintsPerGame &&
      gameState.gameStatus === GameStatus.PLAYING &&
      !gameState.showHint &&
      gameState.remainingTiles > 0 &&
      this.hasTimeRemaining(gameState)
    );
  }

  /**
   * 檢查方塊陣列中是否還有方塊
   */
  static hasTilesRemaining(board: (Tile | null)[][]): boolean {
    for (const row of board) {
      for (const tile of row) {
        if (tile !== null) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 計算剩餘方塊數量
   */
  static countRemainingTiles(board: (Tile | null)[][]): number {
    let count = 0;
    for (const row of board) {
      for (const tile of row) {
        if (tile !== null) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * 檢查方塊是否被選中
   */
  static isTileSelected(tile: Tile, selectedTiles: Tile[]): boolean {
    return selectedTiles.some(t => t.id === tile.id);
  }

  /**
   * 檢查方塊是否為提示方塊
   */
  static isHintTile(tile: Tile, gameState: GameState): boolean {
    if (!gameState.showHint) {
      return false;
    }
    return gameState.hintTiles.some(hintTile => hintTile.id === tile.id);
  }

  /**
   * 驗證關卡類型的有效性
   */
  static isValidLevelType(levelType: string): boolean {
    const validTypes = ['classic', 'down', 'up', 'left', 'right'];
    return validTypes.includes(levelType);
  }
}