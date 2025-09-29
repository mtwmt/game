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
export function calculateOptimalMobileBoard(screenWidth: number, screenHeight: number): { width: number; height: number; mineCount: number } {
  const CELL_SIZE = 32;        // 固定格子尺寸 32px
  const PADDING_HORIZONTAL = 40;    // 左右邊距
  const PADDING_VERTICAL = 256;     // 固定預留 200px 給 header + footer + 統計區域 + 按鈕
  const GAP_TOTAL = 4;         // 格子間距總和估計值
  const BORDER_TOTAL = 8;      // 邊框總和估計值

  // 計算可用寬度和高度
  const availableWidth = screenWidth - PADDING_HORIZONTAL - GAP_TOTAL - BORDER_TOTAL;
  const availableHeight = screenHeight - PADDING_VERTICAL - GAP_TOTAL - BORDER_TOTAL;

  // 計算最大可容納的格子數
  const maxWidth = Math.floor(availableWidth / CELL_SIZE);
  const maxHeight = Math.floor(availableHeight / CELL_SIZE);

  // 設定最小和最大限制
  const MIN_BOARD_SIZE = 6;
  const MAX_BOARD_WIDTH = 20;
  const MAX_BOARD_HEIGHT = 25;
  const MINE_DENSITY = 0.18; // 18% 地雷密度

  // 動態計算最適棋盤尺寸
  const optimalWidth = Math.max(MIN_BOARD_SIZE, Math.min(maxWidth, MAX_BOARD_WIDTH));
  const optimalHeight = Math.max(MIN_BOARD_SIZE, Math.min(maxHeight, MAX_BOARD_HEIGHT));
  const totalCells = optimalWidth * optimalHeight;
  const mineCount = Math.max(1, Math.floor(totalCells * MINE_DENSITY));

  const dynamicBoard = {
    width: optimalWidth,
    height: optimalHeight,
    mineCount: mineCount
  };

  console.log('🖥️ 螢幕尺寸計算:', {
    screenWidth,
    screenHeight,
    availableWidth,
    availableHeight,
    maxWidth,
    maxHeight,
    cellSize: CELL_SIZE
  });

  console.log('✅ 動態計算棋盤配置:', {
    width: dynamicBoard.width,
    height: dynamicBoard.height,
    mineCount: dynamicBoard.mineCount,
    totalCells: totalCells,
    mineDensity: Math.round((dynamicBoard.mineCount / totalCells) * 100) + '%'
  });

  return dynamicBoard;
}

// 動態手機版難度配置生成
export function generateDynamicMobileConfigs(screenWidth: number, screenHeight: number): Record<Difficulty, DifficultyConfig> {
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
export function getDifficultyConfigs(isMobile: boolean, screenWidth?: number, screenHeight?: number): Record<Difficulty, DifficultyConfig> {
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
