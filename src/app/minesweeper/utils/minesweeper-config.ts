import { Difficulty, DifficultyConfig } from '../minesweeper.interface';

// PC版難度配置 - 傳統踩地雷尺寸
export const DESKTOP_DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  [Difficulty.BEGINNER]: {
    width: 9,
    height: 9,
    mineCount: 10,
    name: '初級',
  },
  [Difficulty.INTERMEDIATE]: {
    width: 16,
    height: 16,
    mineCount: 40,
    name: '中級',
  },
  [Difficulty.EXPERT]: {
    width: 30,
    height: 16,
    mineCount: 99,
    name: '專家',
  },
  [Difficulty.CUSTOM]: {
    width: 16,
    height: 16,
    mineCount: 40,
    name: '自訂',
  },
};

// 手機版難度配置 - 適合觸控操作
export const MOBILE_DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  [Difficulty.BEGINNER]: {
    width: 8,
    height: 8,
    mineCount: 8,
    name: '初級',
  },
  [Difficulty.INTERMEDIATE]: {
    width: 11,
    height: 11,
    mineCount: 20,
    name: '中級',
  },
  [Difficulty.EXPERT]: {
    width: 12,
    height: 15,
    mineCount: 40,
    name: '專家',
  },
  [Difficulty.CUSTOM]: {
    width: 11,
    height: 11,
    mineCount: 20,
    name: '自訂',
  },
};

// 動態難度配置函數
export function getDifficultyConfigs(isMobile: boolean): Record<Difficulty, DifficultyConfig> {
  return isMobile ? MOBILE_DIFFICULTY_CONFIGS : DESKTOP_DIFFICULTY_CONFIGS;
}

// 向後兼容性
export const DIFFICULTY_CONFIGS = DESKTOP_DIFFICULTY_CONFIGS;

export const GAME_CONSTANTS = {
  MIN_BOARD_SIZE: 5,
  MAX_BOARD_SIZE: 50,
  MIN_MINE_COUNT: 1,
  CELL_SIZE: 32,
  FLAG_CHAR: '🚩',
  MINE_CHAR: '💣',
  EXPLOSION_CHAR: '💥',
} as const;

export const CELL_STATES = {
  HIDDEN: 0,
  REVEALED: 1,
  FLAGGED: 2,
} as const;
