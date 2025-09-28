import { Position, Cell } from '../minesweeper.interface';
import { MinesweeperValidation } from './minesweeper-validation';

export class MineGenerator {

  /**
   * 生成地雷位置，避開第一次點擊位置及其鄰近區域
   */
  static generateMinePositions(
    width: number,
    height: number,
    mineCount: number,
    firstClickPosition?: Position
  ): Position[] {
    const totalCells = width * height;
    const excludedPositions = new Set<string>();

    // 如果有第一次點擊位置，排除該位置及其鄰近區域
    if (firstClickPosition) {
      const neighbors = MinesweeperValidation.getNeighborPositions(
        firstClickPosition,
        width,
        height
      );

      // 排除第一次點擊位置
      excludedPositions.add(this.positionToString(firstClickPosition));

      // 排除鄰近位置
      neighbors.forEach(pos => {
        excludedPositions.add(this.positionToString(pos));
      });
    }

    const availablePositions: Position[] = [];

    // 建立可用位置列表
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const position = { x, y };
        if (!excludedPositions.has(this.positionToString(position))) {
          availablePositions.push(position);
        }
      }
    }

    // 檢查是否有足夠的位置放置地雷
    const maxPossibleMines = availablePositions.length;
    const finalMineCount = Math.min(mineCount, maxPossibleMines);

    // 隨機選擇地雷位置
    const minePositions: Position[] = [];
    const shuffledPositions = this.shuffleArray([...availablePositions]);

    for (let i = 0; i < finalMineCount; i++) {
      minePositions.push(shuffledPositions[i]);
    }

    return minePositions;
  }

  /**
   * 計算每個格子的鄰近地雷數量
   */
  static calculateNeighborMineCounts(
    board: Cell[][],
    width: number,
    height: number
  ): void {
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const cell = board[x][y];
        if (!cell.isMine) {
          cell.neighborMineCount = this.countNeighborMines(
            { x, y },
            board,
            width,
            height
          );
        }
      }
    }
  }

  /**
   * 計算指定位置的鄰近地雷數量
   */
  private static countNeighborMines(
    position: Position,
    board: Cell[][],
    width: number,
    height: number
  ): number {
    const neighbors = MinesweeperValidation.getNeighborPositions(
      position,
      width,
      height
    );

    return neighbors.reduce((count, neighborPos) => {
      const neighborCell = board[neighborPos.x][neighborPos.y];
      return count + (neighborCell.isMine ? 1 : 0);
    }, 0);
  }

  /**
   * Fisher-Yates 洗牌算法
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * 將位置轉換為字串以便用作 Set 的鍵值
   */
  private static positionToString(position: Position): string {
    return `${position.x},${position.y}`;
  }

  /**
   * 檢查兩個位置是否相同
   */
  static positionsEqual(pos1: Position, pos2: Position): boolean {
    return pos1.x === pos2.x && pos1.y === pos2.y;
  }
}