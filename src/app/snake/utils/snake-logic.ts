import { Position, Direction, MoveResult } from '../snake.interface';
import { SnakeValidation } from './snake-validation';

/**
 * Snake 遊戲邏輯類
 * 所有邏輯方法都是純函數，無副作用
 */
export class SnakeLogic {
  /**
   * 根據方向計算新的頭部位置
   */
  static getNextHeadPosition(currentHead: Position, direction: Direction): Position {
    const newHead = { ...currentHead };

    switch (direction) {
      case 'UP':
        newHead.y--;
        break;
      case 'DOWN':
        newHead.y++;
        break;
      case 'LEFT':
        newHead.x--;
        break;
      case 'RIGHT':
        newHead.x++;
        break;
    }

    return newHead;
  }

  /**
   * 執行移動並返回結果
   */
  static executeMove(
    snake: Position[],
    direction: Direction,
    food: Position,
    boardSize: number
  ): MoveResult {
    const currentHead = snake[0];
    const newHead = this.getNextHeadPosition(currentHead, direction);

    // 檢查碰撞
    const collision = SnakeValidation.checkCollision(newHead, snake, boardSize);
    if (collision) {
      return {
        success: false,
        ateFood: false,
        collision: true,
        newSnake: snake,
      };
    }

    // 檢查是否吃到食物
    const ateFood = SnakeValidation.isEatingFood(newHead, food);

    // 構建新的蛇身
    const newSnake = [newHead, ...snake];

    // 如果沒吃到食物，移除尾巴
    if (!ateFood) {
      newSnake.pop();
    }

    return {
      success: true,
      ateFood,
      collision: false,
      newSnake,
    };
  }

  /**
   * 生成隨機食物位置（避開蛇身）
   */
  static generateFoodPosition(snake: Position[], boardSize: number): Position {
    const maxAttempts = boardSize * boardSize;
    let attempts = 0;
    let newFood: Position;

    do {
      newFood = {
        x: Math.floor(Math.random() * boardSize),
        y: Math.floor(Math.random() * boardSize),
      };
      attempts++;

      // 防止無限循環（當棋盤幾乎被蛇佔滿時）
      if (attempts >= maxAttempts) {
        // 找出所有未被蛇佔據的位置
        const availablePositions: Position[] = [];
        for (let y = 0; y < boardSize; y++) {
          for (let x = 0; x < boardSize; x++) {
            const pos = { x, y };
            if (!SnakeValidation.isCollidingWithSnake(pos, snake)) {
              availablePositions.push(pos);
            }
          }
        }

        // 如果有可用位置，隨機選一個；否則返回 (0,0)
        if (availablePositions.length > 0) {
          const randomIndex = Math.floor(Math.random() * availablePositions.length);
          return availablePositions[randomIndex];
        }

        return { x: 0, y: 0 };
      }
    } while (SnakeValidation.isCollidingWithSnake(newFood, snake));

    return newFood;
  }

  /**
   * 計算分數增量
   */
  static calculateScoreIncrement(ateFood: boolean, scorePerFood: number): number {
    return ateFood ? scorePerFood : 0;
  }

  /**
   * 檢測滑動方向
   */
  static detectSwipeDirection(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    minDistance: number
  ): Direction | null {
    const deltaX = endX - startX;
    const deltaY = endY - startY;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // 檢查滑動距離是否足夠
    if (Math.max(absDeltaX, absDeltaY) < minDistance) {
      return null;
    }

    // 判斷是水平還是垂直滑動
    if (absDeltaX > absDeltaY) {
      // 水平滑動
      return deltaX > 0 ? 'RIGHT' : 'LEFT';
    } else {
      // 垂直滑動
      return deltaY > 0 ? 'DOWN' : 'UP';
    }
  }
}
