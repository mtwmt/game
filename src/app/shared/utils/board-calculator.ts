/**
 * 動態棋盤配置計算器
 * 根據螢幕尺寸和遊戲參數計算最適合的棋盤配置
 */

export interface BoardCalculatorConfig {
  /** 固定格子尺寸 (px) */
  cellSize: number;
  /** 左右邊距總和 (px) */
  paddingHorizontal: number;
  /** 上下邊距總和 (px) - 包含 header、footer、統計區域等 */
  paddingVertical: number;
  /** 格子間距總和估計值 (px) */
  gapTotal: number;
  /** 邊框總和估計值 (px) */
  borderTotal: number;
  /** 最小棋盤尺寸 */
  minBoardSize: number;
  /** 最大棋盤寬度 */
  maxBoardWidth: number;
  /** 最大棋盤高度 */
  maxBoardHeight: number;
  /** 元素密度 (例如地雷、障礙物等的比例，範圍 0-1) */
  elementDensity?: number;
}

export interface BoardDimensions {
  width: number;
  height: number;
  elementCount?: number; // 可選：地雷數、障礙物數等
}

/**
 * 預設配置：適用於踩地雷等格子類遊戲
 */
export const DEFAULT_BOARD_CONFIG: BoardCalculatorConfig = {
  cellSize: 32,
  paddingHorizontal: 40,
  paddingVertical: 256,
  gapTotal: 4,
  borderTotal: 8,
  minBoardSize: 6,
  maxBoardWidth: 20,
  maxBoardHeight: 25,
  elementDensity: 0.18, // 18% 地雷密度
};

/**
 * 動態計算最適棋盤配置
 *
 * @param screenWidth 螢幕寬度 (px)
 * @param screenHeight 螢幕高度 (px)
 * @param config 棋盤計算配置 (可選，預設使用 DEFAULT_BOARD_CONFIG)
 * @returns 最適棋盤尺寸和元素數量
 *
 * @example
 * ```typescript
 * // 使用預設配置
 * const board = calculateOptimalBoard(375, 667);
 * // { width: 8, height: 12, elementCount: 17 }
 *
 * // 自訂配置
 * const customConfig: BoardCalculatorConfig = {
 *   cellSize: 40,
 *   paddingHorizontal: 32,
 *   paddingVertical: 200,
 *   gapTotal: 4,
 *   borderTotal: 8,
 *   minBoardSize: 8,
 *   maxBoardWidth: 15,
 *   maxBoardHeight: 20,
 *   elementDensity: 0.25
 * };
 * const customBoard = calculateOptimalBoard(768, 1024, customConfig);
 * ```
 */
export function calculateOptimalBoard(
  screenWidth: number,
  screenHeight: number,
  config: Partial<BoardCalculatorConfig> = {}
): BoardDimensions {
  // 合併預設配置和自訂配置
  const finalConfig: BoardCalculatorConfig = { ...DEFAULT_BOARD_CONFIG, ...config };

  const {
    cellSize,
    paddingHorizontal,
    paddingVertical,
    gapTotal,
    borderTotal,
    minBoardSize,
    maxBoardWidth,
    maxBoardHeight,
    elementDensity,
  } = finalConfig;

  // 計算可用寬度和高度
  const availableWidth = screenWidth - paddingHorizontal - gapTotal - borderTotal;
  const availableHeight = screenHeight - paddingVertical - gapTotal - borderTotal;

  // 計算最大可容納的格子數
  const maxWidth = Math.floor(availableWidth / cellSize);
  const maxHeight = Math.floor(availableHeight / cellSize);

  // 動態計算最適棋盤尺寸
  const optimalWidth = Math.max(minBoardSize, Math.min(maxWidth, maxBoardWidth));
  const optimalHeight = Math.max(minBoardSize, Math.min(maxHeight, maxBoardHeight));

  // 計算元素數量（如果有設定密度）
  let elementCount: number | undefined;
  if (elementDensity !== undefined) {
    const totalCells = optimalWidth * optimalHeight;
    elementCount = Math.max(1, Math.floor(totalCells * elementDensity));
  }

  return {
    width: optimalWidth,
    height: optimalHeight,
    ...(elementCount !== undefined && { elementCount }),
  };
}

/**
 * 計算特定寬高比的最適棋盤配置
 *
 * @param screenWidth 螢幕寬度 (px)
 * @param screenHeight 螢幕高度 (px)
 * @param aspectRatio 目標寬高比 (width/height)
 * @param config 棋盤計算配置 (可選)
 * @returns 最適棋盤尺寸和元素數量
 *
 * @example
 * ```typescript
 * // 計算正方形棋盤 (1:1)
 * const squareBoard = calculateOptimalBoardWithRatio(375, 667, 1);
 *
 * // 計算 16:9 寬屏棋盤
 * const wideBoard = calculateOptimalBoardWithRatio(375, 667, 16/9);
 * ```
 */
export function calculateOptimalBoardWithRatio(
  screenWidth: number,
  screenHeight: number,
  aspectRatio: number,
  config: Partial<BoardCalculatorConfig> = {}
): BoardDimensions {
  const board = calculateOptimalBoard(screenWidth, screenHeight, config);

  // 根據寬高比調整尺寸
  const currentRatio = board.width / board.height;

  if (currentRatio > aspectRatio) {
    // 目前太寬，調整寬度
    board.width = Math.floor(board.height * aspectRatio);
  } else if (currentRatio < aspectRatio) {
    // 目前太窄，調整高度
    board.height = Math.floor(board.width / aspectRatio);
  }

  // 重新計算元素數量
  if (config.elementDensity !== undefined || DEFAULT_BOARD_CONFIG.elementDensity !== undefined) {
    const density = config.elementDensity ?? DEFAULT_BOARD_CONFIG.elementDensity!;
    const totalCells = board.width * board.height;
    board.elementCount = Math.max(1, Math.floor(totalCells * density));
  }

  return board;
}