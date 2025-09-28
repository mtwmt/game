import { Position, Cell, GameState } from '../minesweeper.interface';
import { GAME_CONSTANTS } from './minesweeper-config';

export class MinesweeperValidation {

  /**
   * 檢查位置是否在遊戲板範圍內
   */
  static isValidPosition(position: Position, width: number, height: number): boolean {
    return position.x >= 0 && position.x < width && position.y >= 0 && position.y < height;
  }

  /**
   * 檢查遊戲設定是否有效
   */
  static isValidGameConfig(width: number, height: number, mineCount: number): boolean {
    const totalCells = width * height;

    return (
      width >= GAME_CONSTANTS.MIN_BOARD_SIZE &&
      height >= GAME_CONSTANTS.MIN_BOARD_SIZE &&
      width <= GAME_CONSTANTS.MAX_BOARD_SIZE &&
      height <= GAME_CONSTANTS.MAX_BOARD_SIZE &&
      mineCount >= GAME_CONSTANTS.MIN_MINE_COUNT &&
      mineCount < totalCells // 確保不是所有格子都是地雷
    );
  }

  /**
   * 檢查是否可以進行遊戲操作
   */
  static canMakeMove(gameState: GameState): boolean {
    return gameState.gameStatus === 'playing' || gameState.gameStatus === 'waiting';
  }

  /**
   * 檢查格子是否可以被點擊
   */
  static canRevealCell(cell: Cell): boolean {
    return !cell.isRevealed && !cell.isFlagged;
  }

  /**
   * 檢查格子是否可以被標記/取消標記
   */
  static canToggleFlag(cell: Cell): boolean {
    return !cell.isRevealed;
  }

  /**
   * 檢查遊戲是否獲勝
   */
  static checkWinCondition(gameState: GameState): boolean {
    const totalCells = gameState.width * gameState.height;
    const nonMineCells = totalCells - gameState.mineCount;

    return gameState.revealedCount === nonMineCells;
  }

  /**
   * 檢查是否踩到地雷
   */
  static checkGameOver(cell: Cell): boolean {
    return cell.isMine && cell.isRevealed;
  }

  /**
   * 獲取相鄰位置
   */
  static getNeighborPositions(position: Position, width: number, height: number): Position[] {
    const neighbors: Position[] = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue; // 跳過自己

        const newPos = { x: position.x + dx, y: position.y + dy };
        if (this.isValidPosition(newPos, width, height)) {
          neighbors.push(newPos);
        }
      }
    }

    return neighbors;
  }

  /**
   * 驗證旗標數量是否超過地雷數量
   */
  static isValidFlagCount(flaggedCount: number, mineCount: number): boolean {
    return flaggedCount <= mineCount;
  }
}