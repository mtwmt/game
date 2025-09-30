import { Difficulty, DifficultyConfig } from '../minesweeper.interface';
import { calculateOptimalBoard, DEFAULT_BOARD_CONFIG } from '../../shared/utils/board-calculator';

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
    // 注意：此配置不會被使用，專家級使用動態計算
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

// 動態計算最適棋盤配置
export function calculateOptimalMobileBoard(
  screenWidth: number,
  screenHeight: number
): { width: number; height: number; mineCount: number } {
  // 使用共用的棋盤計算器，配置參數與預設值一致
  const board = calculateOptimalBoard(screenWidth, screenHeight, DEFAULT_BOARD_CONFIG);

  return {
    width: board.width,
    height: board.height,
    mineCount: board.elementCount!,
  };
}

// 動態手機版難度配置生成
export function generateDynamicMobileConfigs(
  screenWidth: number,
  screenHeight: number
): Record<Difficulty, DifficultyConfig> {
  const expertBoard = calculateOptimalMobileBoard(screenWidth, screenHeight);

  return {
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
      width: expertBoard.width,
      height: expertBoard.height,
      mineCount: expertBoard.mineCount,
      name: '專家',
    },
    [Difficulty.CUSTOM]: {
      width: 11,
      height: 11,
      mineCount: 20,
      name: '自訂',
    },
  };
}

// 動態難度配置函數 (向後兼容)
export function getDifficultyConfigs(
  isMobile: boolean,
  screenWidth?: number,
  screenHeight?: number
): Record<Difficulty, DifficultyConfig> {
  if (isMobile && screenWidth && screenHeight) {
    return generateDynamicMobileConfigs(screenWidth, screenHeight);
  }
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
