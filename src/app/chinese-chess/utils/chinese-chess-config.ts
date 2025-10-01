import { PieceType, PlayerColor } from '../chinese-chess-piece.interface';

// 遊戲常數
export const GAME_CONSTANTS = {
  BOARD_WIDTH: 9,
  BOARD_HEIGHT: 10,
  PALACE_WIDTH: 3,
  PALACE_HEIGHT: 3,
  PALACE_LEFT: 3,
  PALACE_RIGHT: 5,
  RED_PALACE_TOP: 7,
  RED_PALACE_BOTTOM: 9,
  BLACK_PALACE_TOP: 0,
  BLACK_PALACE_BOTTOM: 2,
  RIVER_POSITION: 5, // 楚河漢界的位置
  MAX_MOVE_HISTORY: 500,
  AI_THINK_TIME_LIMIT: 5000, // 5秒
  CACHE_SIZE: 1000, // LRU 快取大小
  AI_THINKING_DELAY: 500, // AI 思考延遲
  CACHE_CLEANUP_INTERVAL: 10, // 每10步清理快取
} as const;

// 性能監控常數
export const PERFORMANCE_CONSTANTS = {
  ENABLE_PERFORMANCE_LOGGING: true, // 是否啟用性能記錄
  LOG_CACHE_STATS: true, // 是否記錄快取統計
  LOG_AI_PERFORMANCE: true, // 是否記錄AI性能
} as const;

// ===========================================
// XQWLight 原版評分表 (經典配置)
// ===========================================

// XQWLight 棋子基本價值 (原版標準)
export const PIECE_VALUES = {
  [PieceType.KING]: 10000, // 將帥
  [PieceType.ROOK]: 600, // 車
  [PieceType.CANNON]: 300, // 炮/砲
  [PieceType.HORSE]: 300, // 馬
  [PieceType.ADVISOR]: 20, // 士/仕
  [PieceType.ELEPHANT]: 20, // 相/象
  [PieceType.SOLDIER]: 100, // 兵/卒
};

// XQWLight 經典位置評分表
export const POSITION_VALUES = {
  // 將帥位置表 (XQWLight 原版)
  [PieceType.KING]: [
    [0, 0, 0, 8888, 8888, 8888, 0, 0, 0],
    [0, 0, 0, 8888, 8888, 8888, 0, 0, 0],
    [0, 0, 0, 8888, 8888, 8888, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, -8888, -8888, -8888, 0, 0, 0],
    [0, 0, 0, -8888, -8888, -8888, 0, 0, 0],
    [0, 0, 0, -8888, -8888, -8888, 0, 0, 0],
  ],

  // 士位置表 (XQWLight 原版)
  [PieceType.ADVISOR]: [
    [0, 0, 0, 20, 0, 20, 0, 0, 0],
    [0, 0, 0, 0, 23, 0, 0, 0, 0],
    [0, 0, 0, 20, 0, 20, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, -20, 0, -20, 0, 0, 0],
    [0, 0, 0, 0, -23, 0, 0, 0, 0],
    [0, 0, 0, -20, 0, -20, 0, 0, 0],
  ],

  // 相象位置表 (XQWLight 原版)
  [PieceType.ELEPHANT]: [
    [0, 0, 20, 0, 0, 0, 20, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [18, 0, 0, 0, 23, 0, 0, 0, 18],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 20, 0, 0, 0, 20, 0, 0],
    [0, 0, -20, 0, 0, 0, -20, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [-18, 0, 0, 0, -23, 0, 0, 0, -18],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, -20, 0, 0, 0, -20, 0, 0],
  ],

  // 車位置表 (XQWLight 原版)
  [PieceType.ROOK]: [
    [206, 208, 207, 213, 214, 213, 207, 208, 206],
    [206, 212, 209, 216, 233, 216, 209, 212, 206],
    [206, 208, 207, 214, 216, 214, 207, 208, 206],
    [206, 213, 213, 216, 216, 216, 213, 213, 206],
    [208, 211, 211, 214, 215, 214, 211, 211, 208],
    [208, 212, 212, 214, 215, 214, 212, 212, 208],
    [204, 209, 204, 212, 214, 212, 204, 209, 204],
    [198, 208, 204, 212, 212, 212, 204, 208, 198],
    [200, 208, 206, 212, 200, 212, 206, 208, 200],
    [194, 206, 204, 212, 200, 212, 204, 206, 194],
  ],

  // 馬位置表 (XQWLight 原版)
  [PieceType.HORSE]: [
    [90, 90, 90, 96, 103, 96, 90, 90, 90],
    [90, 96, 103, 97, 94, 97, 103, 96, 90],
    [92, 98, 99, 103, 99, 103, 99, 98, 92],
    [93, 108, 100, 107, 100, 107, 100, 108, 93],
    [90, 100, 99, 103, 104, 103, 99, 100, 90],
    [90, 98, 101, 102, 103, 102, 101, 98, 90],
    [92, 94, 98, 95, 98, 95, 98, 94, 92],
    [93, 92, 94, 95, 92, 95, 94, 92, 93],
    [85, 90, 92, 93, 78, 93, 92, 90, 85],
    [88, 85, 90, 88, 90, 88, 90, 85, 88],
  ],

  // 砲位置表 (XQWLight 原版)
  [PieceType.CANNON]: [
    [100, 100, 96, 91, 90, 91, 96, 100, 100],
    [98, 98, 96, 92, 89, 92, 96, 98, 98],
    [97, 97, 96, 91, 92, 91, 96, 97, 97],
    [96, 99, 99, 98, 100, 98, 99, 99, 96],
    [96, 96, 96, 96, 100, 96, 96, 96, 96],
    [95, 96, 99, 96, 100, 96, 99, 96, 95],
    [96, 96, 96, 96, 96, 96, 96, 96, 96],
    [97, 96, 100, 99, 101, 99, 100, 96, 97],
    [96, 97, 98, 98, 98, 98, 98, 97, 96],
    [96, 96, 97, 99, 99, 99, 97, 96, 96],
  ],

  // 兵卒位置表 (XQWLight 原版)
  [PieceType.SOLDIER]: [
    [9, 9, 9, 11, 13, 11, 9, 9, 9],
    [19, 24, 34, 42, 44, 42, 34, 24, 19],
    [19, 24, 32, 37, 37, 37, 32, 24, 19],
    [19, 23, 27, 29, 30, 29, 27, 23, 19],
    [14, 18, 20, 27, 29, 27, 20, 18, 14],
    [7, 0, 13, 0, 16, 0, 13, 0, 7],
    [7, 0, 7, 0, 15, 0, 7, 0, 7],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
};

// XQWLight 搜尋深度配置
export const XQWLIGHT_CONFIG = {
  DEPTHS: {
    easy: 5,      // 簡單：5層 (基礎棋力)
    medium: 10,   // 中等：10層 (中級棋力)
    hard: 14,     // 困難：14層 (高級棋力，逼近專業)
  },
  MAX_TIME: 15000, // 15秒最大思考時間 (深度搜尋需要更多時間)
  INFINITY: 20000,
  MATE_VALUE: 10000,
  CHECK_BONUS: 150,      // 提高將軍獎勵 (50→150)
  MOBILITY_FACTOR: 3,    // 提高機動性權重 (2→3)
};

// XQWLight 移動排序權重
export const MOVE_ORDER_WEIGHTS = {
  CAPTURE_BONUS: 1000,
  KILLER_MOVE_BONUS: 500,
  HISTORY_BONUS_MAX: 100,
  POSITION_BONUS_FACTOR: 10,
  CENTER_CONTROL_FACTOR: 5,
};

// XQWLight 特殊評估函數
export const XQWLIGHT_EVALUATIONS = {
  // 將帥安全評估
  KING_SAFETY: {
    ADJACENT_PIECE_BONUS: 5,
    FORTRESS_BONUS: 10,
    EXPOSED_PENALTY: -20,
  },

  // 兵卒推進評估
  PAWN_ADVANCEMENT: {
    CROSSED_RIVER_BONUS: 15,
    ADVANCED_BONUS: 10,
    PROMOTION_THREAT_BONUS: 20,
  },

  // 機動性評估
  MOBILITY: {
    ROOK_MOBILITY_FACTOR: 3,
    CANNON_MOBILITY_FACTOR: 2,
    HORSE_MOBILITY_FACTOR: 4,
    MIN_MOBILITY_BONUS: -10,
    MAX_MOBILITY_BONUS: 30,
  },
};

/**
 * XQWLight 專用評估函數 - 將帥安全性
 */
export function evaluateKingSafety(
  kingPos: { x: number; y: number },
  board: any[][],
  color: PlayerColor
): number {
  let safety = 0;
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (const [dx, dy] of directions) {
    const x = kingPos.x + dx;
    const y = kingPos.y + dy;

    if (x >= 0 && x < 9 && y >= 0 && y < 10) {
      const neighbor = board[y][x];
      if (neighbor && neighbor.color === color) {
        safety += XQWLIGHT_EVALUATIONS.KING_SAFETY.ADJACENT_PIECE_BONUS;
      }
    }
  }

  return safety;
}

/**
 * XQWLight 專用評估函數 - 兵卒推進
 */
export function evaluatePawnAdvancement(
  pawnPos: { x: number; y: number },
  color: PlayerColor
): number {
  let advancement = 0;

  if (color === PlayerColor.BLACK) {
    // 黑方兵：y >= 5 為過河
    if (pawnPos.y >= 5) {
      advancement += XQWLIGHT_EVALUATIONS.PAWN_ADVANCEMENT.CROSSED_RIVER_BONUS;
      advancement += (pawnPos.y - 5) * XQWLIGHT_EVALUATIONS.PAWN_ADVANCEMENT.ADVANCED_BONUS;
    }
  } else {
    // 紅方兵：y <= 4 為過河
    if (pawnPos.y <= 4) {
      advancement += XQWLIGHT_EVALUATIONS.PAWN_ADVANCEMENT.CROSSED_RIVER_BONUS;
      advancement += (4 - pawnPos.y) * XQWLIGHT_EVALUATIONS.PAWN_ADVANCEMENT.ADVANCED_BONUS;
    }
  }

  return advancement;
}

/**
 * XQWLight 專用評估函數 - 機動性評估
 */
export function evaluateMobility(pieceType: PieceType, moveCount: number): number {
  let mobility = 0;

  switch (pieceType) {
    case PieceType.ROOK:
      mobility = moveCount * XQWLIGHT_EVALUATIONS.MOBILITY.ROOK_MOBILITY_FACTOR;
      break;
    case PieceType.CANNON:
      mobility = moveCount * XQWLIGHT_EVALUATIONS.MOBILITY.CANNON_MOBILITY_FACTOR;
      break;
    case PieceType.HORSE:
      mobility = moveCount * XQWLIGHT_EVALUATIONS.MOBILITY.HORSE_MOBILITY_FACTOR;
      break;
    default:
      mobility = moveCount;
  }

  return Math.max(
    XQWLIGHT_EVALUATIONS.MOBILITY.MIN_MOBILITY_BONUS,
    Math.min(XQWLIGHT_EVALUATIONS.MOBILITY.MAX_MOBILITY_BONUS, mobility)
  );
}

/**
 * XQWLight 原版評估函數 - 獲取棋子價值
 */
export function getPieceValue(
  pieceType: PieceType,
  x: number,
  y: number,
  color: PlayerColor
): number {
  const baseValue = PIECE_VALUES[pieceType];

  if (!POSITION_VALUES[pieceType]) {
    return baseValue;
  }

  let positionValue: number;

  // 紅方需要鏡像翻轉位置 (y座標翻轉)
  if (color === PlayerColor.RED) {
    const flippedY = 9 - y;
    positionValue = POSITION_VALUES[pieceType][flippedY][x];
  } else {
    positionValue = POSITION_VALUES[pieceType][y][x];
  }

  return baseValue + positionValue;
}

/**
 * XQWLight 原版評估函數 - 獲取位置獎勵
 */
export function getPositionBonus(
  pieceType: PieceType,
  x: number,
  y: number,
  color: PlayerColor
): number {
  if (!POSITION_VALUES[pieceType]) {
    return 0;
  }

  // 紅方需要鏡像翻轉位置 (y座標翻轉)
  if (color === PlayerColor.RED) {
    const flippedY = 9 - y;
    return POSITION_VALUES[pieceType][flippedY][x];
  } else {
    return POSITION_VALUES[pieceType][y][x];
  }
}
