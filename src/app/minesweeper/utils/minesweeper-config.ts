import { Difficulty, DifficultyConfig } from '../minesweeper.interface';

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
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
    width: 20,
    height: 30,
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
