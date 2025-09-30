import { Position, Direction, GameStatus, GameState } from '../snake.interface';
import { OPPOSITE_DIRECTIONS } from './snake-config';

/**
 * Snake 遊戲驗證類
 * 所有驗證方法都是純函數，無副作用
 */
export class SnakeValidation {
  /**
   * 檢查位置是否在棋盤範圍內
   */
  static isWithinBounds(position: Position, boardSize: number): boolean {
    return (
      position.x >= 0 &&
      position.x < boardSize &&
      position.y >= 0 &&
      position.y < boardSize
    );
  }

  /**
   * 檢查位置是否與蛇身碰撞
   */
  static isCollidingWithSnake(position: Position, snake: Position[]): boolean {
    return snake.some(segment =>
      segment.x === position.x && segment.y === position.y
    );
  }

  /**
   * 檢查是否發生碰撞（邊界或自身）
   */
  static checkCollision(head: Position, snake: Position[], boardSize: number): boolean {
    // 檢查邊界碰撞
    if (!this.isWithinBounds(head, boardSize)) {
      return true;
    }

    // 檢查自身碰撞（不包括頭部本身）
    return this.isCollidingWithSnake(head, snake);
  }

  /**
   * 檢查是否吃到食物
   */
  static isEatingFood(head: Position, food: Position): boolean {
    return head.x === food.x && head.y === food.y;
  }

  /**
   * 檢查方向是否有效（不能反向移動）
   */
  static isValidDirection(currentDirection: Direction, newDirection: Direction): boolean {
    return OPPOSITE_DIRECTIONS[currentDirection] !== newDirection;
  }

  /**
   * 檢查遊戲是否可以移動
   */
  static canMove(gameStatus: GameStatus): boolean {
    return gameStatus === GameStatus.PLAYING;
  }

  /**
   * 檢查遊戲是否已開始
   */
  static isGameStarted(gameStatus: GameStatus): boolean {
    return gameStatus === GameStatus.PLAYING || gameStatus === GameStatus.PAUSED;
  }

  /**
   * 檢查遊戲是否結束
   */
  static isGameOver(gameStatus: GameStatus): boolean {
    return gameStatus === GameStatus.GAME_OVER;
  }

  /**
   * 檢查遊戲是否暫停
   */
  static isPaused(gameStatus: GameStatus): boolean {
    return gameStatus === GameStatus.PAUSED;
  }

  /**
   * 檢查兩個位置是否相同
   */
  static isSamePosition(pos1: Position, pos2: Position): boolean {
    return pos1.x === pos2.x && pos1.y === pos2.y;
  }

  /**
   * 驗證遊戲狀態的完整性
   */
  static validateGameState(gameState: GameState): boolean {
    // 檢查蛇身長度
    if (gameState.snake.length === 0) {
      return false;
    }

    // 檢查棋盤大小
    if (gameState.boardSize <= 0) {
      return false;
    }

    // 檢查分數
    if (gameState.score < 0) {
      return false;
    }

    // 檢查食物位置
    if (!this.isWithinBounds(gameState.food, gameState.boardSize)) {
      return false;
    }

    // 檢查蛇的所有位置
    for (const segment of gameState.snake) {
      if (!this.isWithinBounds(segment, gameState.boardSize)) {
        return false;
      }
    }

    return true;
  }
}
