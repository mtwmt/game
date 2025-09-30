// 基礎介面
export interface Position {
  x: number;
  y: number;
}

// 方向類型
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

// 遊戲狀態
export enum GameStatus {
  WAITING = 'waiting',   // 等待開始
  PLAYING = 'playing',   // 進行中
  PAUSED = 'paused',     // 暫停
  GAME_OVER = 'gameover' // 遊戲結束
}

// 遊戲狀態介面
export interface GameState {
  snake: Position[];        // 蛇身位置陣列
  food: Position;          // 食物位置
  direction: Direction;    // 當前移動方向
  score: number;           // 分數
  gameStatus: GameStatus;  // 遊戲狀態
  boardSize: number;       // 棋盤大小
}

// 移動結果
export interface MoveResult {
  success: boolean;        // 是否移動成功
  ateFood: boolean;        // 是否吃到食物
  collision: boolean;      // 是否發生碰撞
  newSnake: Position[];    // 移動後的蛇身
}

// 遊戲規則
export interface GameRule {
  title: string;
  rules: string[];
}
