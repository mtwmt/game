import { PieceType, PlayerColor } from './chess-piece.interface';

// 棋子基本價值
export const PIECE_VALUES = {
  [PieceType.KING]: 10000, // 將帥
  [PieceType.ROOK]: 500,   // 車
  [PieceType.CANNON]: 450, // 炮/砲
  [PieceType.HORSE]: 400,  // 馬
  [PieceType.ELEPHANT]: 200, // 相/象
  [PieceType.ADVISOR]: 200,  // 士/仕
  [PieceType.SOLDIER]: 100,  // 兵/卒
};

// 位置價值表 - 黑方視角 (0,0為左上角)
// 紅方需要鏡像翻轉這些表格

// 將帥位置價值表 (宮內移動，中央更安全)
export const KING_POSITION_VALUES = [
  [  0,   0,   0,  20,  30,  20,   0,   0,   0 ],
  [  0,   0,   0,  10,  20,  10,   0,   0,   0 ],
  [  0,   0,   0,   5,  10,   5,   0,   0,   0 ],
  [  0,   0,   0,   0,   0,   0,   0,   0,   0 ],
  [  0,   0,   0,   0,   0,   0,   0,   0,   0 ],
  [  0,   0,   0,   0,   0,   0,   0,   0,   0 ],
  [  0,   0,   0,   0,   0,   0,   0,   0,   0 ],
  [  0,   0,   0,  -5, -10,  -5,   0,   0,   0 ],
  [  0,   0,   0, -10, -20, -10,   0,   0,   0 ],
  [  0,   0,   0, -20, -30, -20,   0,   0,   0 ]
];

// 車位置價值表 (控制線路，中央和開放線更好)
export const ROOK_POSITION_VALUES = [
  [ 40,  50,  50,  55,  60,  55,  50,  50,  40 ],
  [ 30,  40,  45,  50,  55,  50,  45,  40,  30 ],
  [ 20,  30,  35,  40,  45,  40,  35,  30,  20 ],
  [ 10,  20,  25,  30,  35,  30,  25,  20,  10 ],
  [  5,  15,  20,  25,  30,  25,  20,  15,   5 ],
  [ -5,  -5,  10,  15,  20,  15,  10,  -5,  -5 ],
  [-10, -10,   0,   5,  10,   5,   0, -10, -10 ],
  [-15, -15,  -5,   0,   5,   0,  -5, -15, -15 ],
  [-20, -20, -10,  -5,   0,  -5, -10, -20, -20 ],
  [-25, -25, -15, -10,  -5, -10, -15, -25, -25 ]
];

// 炮位置價值表 (中路威力大，不要太靠前)
export const CANNON_POSITION_VALUES = [
  [ 30,  35,  40,  45,  50,  45,  40,  35,  30 ],
  [ 25,  30,  35,  40,  45,  40,  35,  30,  25 ],
  [ 20,  25,  30,  35,  40,  35,  30,  25,  20 ],
  [ 15,  20,  25,  30,  35,  30,  25,  20,  15 ],
  [ 10,  15,  20,  25,  30,  25,  20,  15,  10 ],
  [  5,  10,  15,  20,  25,  20,  15,  10,   5 ],
  [  0,   5,  10,  15,  20,  15,  10,   5,   0 ],
  [ -5,   0,   5,  10,  15,  10,   5,   0,  -5 ],
  [-10,  -5,   0,   5,  10,   5,   0,  -5, -10 ],
  [-15, -10,  -5,   0,   5,   0,  -5, -10, -15 ]
];

// 馬位置價值表 (中央控制力強，避免邊角)
export const HORSE_POSITION_VALUES = [
  [ 10,  20,  30,  35,  40,  35,  30,  20,  10 ],
  [ 15,  25,  35,  40,  45,  40,  35,  25,  15 ],
  [ 20,  30,  40,  45,  50,  45,  40,  30,  20 ],
  [ 25,  35,  45,  50,  55,  50,  45,  35,  25 ],
  [ 20,  30,  40,  45,  50,  45,  40,  30,  20 ],
  [ 15,  25,  35,  40,  45,  40,  35,  25,  15 ],
  [ 10,  20,  30,  35,  40,  35,  30,  20,  10 ],
  [  5,  15,  25,  30,  35,  30,  25,  15,   5 ],
  [  0,  10,  20,  25,  30,  25,  20,  10,   0 ],
  [ -5,   5,  15,  20,  25,  20,  15,   5,  -5 ]
];

// 相/象位置價值表 (防守本方，對角線移動)
export const ELEPHANT_POSITION_VALUES = [
  [  0,   0,  20,   0,   0,   0,  20,   0,   0 ],
  [  0,   0,   0,   0,   0,   0,   0,   0,   0 ],
  [ 15,   0,   0,   0,  25,   0,   0,   0,  15 ],
  [  0,   0,   0,   0,   0,   0,   0,   0,   0 ],
  [ 10,   0,   0,   0,  20,   0,   0,   0,  10 ],
  [  0,   0,   0,   0,   0,   0,   0,   0,   0 ],
  [-10,   0,   0,   0, -20,   0,   0,   0, -10 ],
  [  0,   0,   0,   0,   0,   0,   0,   0,   0 ],
  [-15,   0,   0,   0, -25,   0,   0,   0, -15 ],
  [  0,   0, -20,   0,   0,   0, -20,   0,   0 ]
];

// 士位置價值表 (宮內防守，中心最佳)
export const ADVISOR_POSITION_VALUES = [
  [  0,   0,   0,  20,   0,  20,   0,   0,   0 ],
  [  0,   0,   0,   0,  30,   0,   0,   0,   0 ],
  [  0,   0,   0,  15,   0,  15,   0,   0,   0 ],
  [  0,   0,   0,   0,   0,   0,   0,   0,   0 ],
  [  0,   0,   0,   0,   0,   0,   0,   0,   0 ],
  [  0,   0,   0,   0,   0,   0,   0,   0,   0 ],
  [  0,   0,   0,   0,   0,   0,   0,   0,   0 ],
  [  0,   0,   0, -15,   0, -15,   0,   0,   0 ],
  [  0,   0,   0,   0, -30,   0,   0,   0,   0 ],
  [  0,   0,   0, -20,   0, -20,   0,   0,   0 ]
];

// 兵/卒位置價值表 (過河後價值增加，越深入敵陣越好)
export const SOLDIER_POSITION_VALUES = [
  [ 15,  20,  25,  30,  35,  30,  25,  20,  15 ],
  [ 10,  15,  20,  25,  30,  25,  20,  15,  10 ],
  [  8,  12,  16,  20,  25,  20,  16,  12,   8 ],
  [  6,  10,  14,  18,  22,  18,  14,  10,   6 ],
  [  5,   8,  12,  16,  20,  16,  12,   8,   5 ],
  [  3,   6,   9,  12,  15,  12,   9,   6,   3 ],
  [  2,   4,   6,   8,  10,   8,   6,   4,   2 ],
  [  1,   2,   3,   4,   5,   4,   3,   2,   1 ],
  [  0,   1,   2,   3,   4,   3,   2,   1,   0 ],
  [  0,   0,   1,   2,   3,   2,   1,   0,   0 ]
];

// 位置價值表映射
export const POSITION_VALUES = {
  [PieceType.KING]: KING_POSITION_VALUES,
  [PieceType.ROOK]: ROOK_POSITION_VALUES,
  [PieceType.CANNON]: CANNON_POSITION_VALUES,
  [PieceType.HORSE]: HORSE_POSITION_VALUES,
  [PieceType.ELEPHANT]: ELEPHANT_POSITION_VALUES,
  [PieceType.ADVISOR]: ADVISOR_POSITION_VALUES,
  [PieceType.SOLDIER]: SOLDIER_POSITION_VALUES,
};

/**
 * 獲取棋子在指定位置的價值 (基本價值 + 位置價值)
 */
export function getPieceValue(pieceType: PieceType, x: number, y: number, color: PlayerColor): number {
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
 * 獲取棋子的位置獎勵分數
 */
export function getPositionBonus(pieceType: PieceType, x: number, y: number, color: PlayerColor): number {
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