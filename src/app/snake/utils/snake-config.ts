import { Direction, GameRule } from '../snake.interface';

/**
 * 遊戲配置常數
 */
export const GAME_CONFIG = {
  boardSize: 20,           // 棋盤大小 (20x20)
  gameSpeed: 150,          // 遊戲速度 (毫秒)
  initialSnakeLength: 1,   // 初始蛇身長度
  scorePerFood: 10,        // 每個食物的分數
  minSwipeDistance: 30,    // 最小滑動距離 (px)
} as const;

/**
 * 初始位置配置
 */
export const INITIAL_POSITIONS = {
  snake: { x: 10, y: 10 },  // 蛇的初始位置 (中心)
  food: { x: 5, y: 5 },     // 食物的初始位置
} as const;

/**
 * 初始方向
 */
export const INITIAL_DIRECTION: Direction = 'RIGHT';

/**
 * 方向相反映射
 */
export const OPPOSITE_DIRECTIONS: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
} as const;

/**
 * 鍵盤按鍵到方向的映射
 */
export const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
  ArrowLeft: 'LEFT',
  ArrowRight: 'RIGHT',
} as const;

/**
 * 遊戲規則定義
 */
export const GAME_RULES: GameRule = {
  title: '貪食蛇遊戲規則',
  rules: [
    '使用方向鍵 (↑↓←→) 或觸控滑動控制蛇的移動方向',
    '吃到紅色食物可以增加分數並讓蛇身變長',
    '避免撞到邊界牆壁或蛇身本體，否則遊戲結束',
    '按空白鍵可以暫停/繼續遊戲',
    '遊戲目標是獲得最高分數，挑戰自己的極限',
    '蛇移動速度固定，需要提前預判路線'
  ]
};
