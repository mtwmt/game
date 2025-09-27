import {
  ChessPiece,
  PieceType,
  PlayerColor,
  Position,
} from '../chess-piece.interface';
import { GAME_CONSTANTS } from './chinese-chess-values';

/**
 * 棋子走法管理類
 * 集中管理所有棋子的移動邏輯
 */
export class PieceMovesManager {
  // 常用方向常數
  private static readonly ORTHOGONAL_DIRECTIONS = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  private static readonly DIAGONAL_DIRECTIONS = [
    { dx: -1, dy: -1 },
    { dx: 1, dy: -1 },
    { dx: -1, dy: 1 },
    { dx: 1, dy: 1 },
  ];

  /**
   * 檢查座標是否在棋盤有效範圍內
   */
  private static isValidPosition(x: number, y: number): boolean {
    return (
      x >= 0 && x < GAME_CONSTANTS.BOARD_WIDTH && y >= 0 && y < GAME_CONSTANTS.BOARD_HEIGHT
    );
  }

  /**
   * 檢查指定位置是否在對應顏色的宮殿內
   */
  private static isInPalace(x: number, y: number, color: PlayerColor): boolean {
    if (color === PlayerColor.RED) {
      return (
        x >= GAME_CONSTANTS.PALACE_LEFT &&
        x <= GAME_CONSTANTS.PALACE_RIGHT &&
        y >= GAME_CONSTANTS.RED_PALACE_TOP &&
        y <= GAME_CONSTANTS.RED_PALACE_BOTTOM
      );
    } else {
      return (
        x >= GAME_CONSTANTS.PALACE_LEFT &&
        x <= GAME_CONSTANTS.PALACE_RIGHT &&
        y >= GAME_CONSTANTS.BLACK_PALACE_TOP &&
        y <= GAME_CONSTANTS.BLACK_PALACE_BOTTOM
      );
    }
  }

  /**
   * 檢查指定 Y 座標是否在該顏色的本方陣地
   */
  private static isOnOwnSide(y: number, color: PlayerColor): boolean {
    if (color === PlayerColor.RED) {
      return y >= 5;
    } else {
      return y <= 4;
    }
  }

  /**
   * 檢查移動對特定棋子是否有效
   */
  private static isValidMoveForPiece(
    move: Position,
    piece: ChessPiece,
    board: (ChessPiece | null)[][]
  ): boolean {
    if (!this.isValidPosition(move.x, move.y)) return false;

    const target = board[move.y][move.x];
    return !target || target.color !== piece.color;
  }

  /**
   * 獲取滑動棋子（車、砲等）的可能移動
   */
  private static getSlidingPieceMoves(
    piece: ChessPiece,
    board: (ChessPiece | null)[][],
    directions: { dx: number; dy: number }[]
  ): Position[] {
    const moves: Position[] = [];
    const { x, y } = piece.position;

    directions.forEach((dir) => {
      for (let i = 1; i < 10; i++) {
        const newX = x + dir.dx * i;
        const newY = y + dir.dy * i;
        if (!this.isValidPosition(newX, newY)) break;

        const target = board[newY][newX];
        if (target) {
          if (target.color !== piece.color) {
            moves.push({ x: newX, y: newY });
          }
          break;
        } else {
          moves.push({ x: newX, y: newY });
        }
      }
    });
    return moves;
  }

  /**
   * 獲取將帥的可能移動
   * 限制在宮殿內，每次只能移動一格（上下左右）
   */
  static getKingMoves(
    piece: ChessPiece,
    board: (ChessPiece | null)[][],
    checkKingFacing: boolean,
    wouldMoveCreateKingFacing?: (piece: ChessPiece, move: Position, board: (ChessPiece | null)[][]) => boolean
  ): Position[] {
    const { x, y } = piece.position;
    const kingMoves = this.ORTHOGONAL_DIRECTIONS.map((dir) => ({
      x: x + dir.dx,
      y: y + dir.dy,
    }));

    return kingMoves.filter((move) => {
      if (!this.isValidPosition(move.x, move.y) || !this.isInPalace(move.x, move.y, piece.color)) {
        return false;
      }

      const target = board[move.y][move.x];
      if (target && target.color === piece.color) {
        return false;
      }

      return !checkKingFacing || !wouldMoveCreateKingFacing?.(piece, move, board);
    });
  }

  /**
   * 獲取士仕的可能移動
   * 限制在宮殿內，只能斜向移動一格
   */
  static getAdvisorMoves(piece: ChessPiece, board: (ChessPiece | null)[][]): Position[] {
    const { x, y } = piece.position;
    const advisorMoves = this.DIAGONAL_DIRECTIONS.map((dir) => ({
      x: x + dir.dx,
      y: y + dir.dy,
    }));

    return advisorMoves.filter(
      (move) =>
        this.isValidPosition(move.x, move.y) &&
        this.isInPalace(move.x, move.y, piece.color) &&
        this.isValidMoveForPiece(move, piece, board)
    );
  }

  /**
   * 獲取象相的可能移動
   * 限制在本方陣地，斜向移動兩格，不能塞象眼
   */
  static getElephantMoves(piece: ChessPiece, board: (ChessPiece | null)[][]): Position[] {
    const { x, y } = piece.position;
    const elephantMoves = [
      { x: x - 2, y: y - 2, block: { x: x - 1, y: y - 1 } },
      { x: x + 2, y: y - 2, block: { x: x + 1, y: y - 1 } },
      { x: x - 2, y: y + 2, block: { x: x - 1, y: y + 1 } },
      { x: x + 2, y: y + 2, block: { x: x + 1, y: y + 1 } },
    ];

    return elephantMoves
      .filter(
        (move) =>
          this.isValidPosition(move.x, move.y) &&
          this.isOnOwnSide(move.y, piece.color) &&
          !board[move.block.y][move.block.x] && // 檢查塞象眼
          this.isValidMoveForPiece(move, piece, board)
      )
      .map((move) => ({ x: move.x, y: move.y }));
  }

  /**
   * 獲取馬的可能移動
   * 日字形移動，不能蹩馬腿
   */
  static getHorseMoves(piece: ChessPiece, board: (ChessPiece | null)[][]): Position[] {
    const { x, y } = piece.position;
    const horseMoves = [
      { x: x - 1, y: y - 2, block: { x, y: y - 1 } },
      { x: x + 1, y: y - 2, block: { x, y: y - 1 } },
      { x: x - 1, y: y + 2, block: { x, y: y + 1 } },
      { x: x + 1, y: y + 2, block: { x, y: y + 1 } },
      { x: x - 2, y: y - 1, block: { x: x - 1, y } },
      { x: x - 2, y: y + 1, block: { x: x - 1, y } },
      { x: x + 2, y: y - 1, block: { x: x + 1, y } },
      { x: x + 2, y: y + 1, block: { x: x + 1, y } },
    ];

    return horseMoves
      .filter(
        (move) =>
          this.isValidPosition(move.x, move.y) &&
          !board[move.block.y][move.block.x] && // 檢查蹩馬腿
          this.isValidMoveForPiece(move, piece, board)
      )
      .map((move) => ({ x: move.x, y: move.y }));
  }

  /**
   * 獲取車的可能移動
   * 橫豎直線移動，遇到棋子停止
   */
  static getRookMoves(piece: ChessPiece, board: (ChessPiece | null)[][]): Position[] {
    return this.getSlidingPieceMoves(piece, board, this.ORTHOGONAL_DIRECTIONS);
  }

  /**
   * 獲取砲炮的可能移動
   * 橫豎直線移動，吃子時必須跳過一個棋子
   */
  static getCannonMoves(piece: ChessPiece, board: (ChessPiece | null)[][]): Position[] {
    const moves: Position[] = [];
    const { x, y } = piece.position;

    this.ORTHOGONAL_DIRECTIONS.forEach((dir) => {
      let hasJumped = false;
      for (let i = 1; i < 10; i++) {
        const newX = x + dir.dx * i;
        const newY = y + dir.dy * i;
        if (!this.isValidPosition(newX, newY)) break;

        const target = board[newY][newX];
        if (target) {
          if (!hasJumped) {
            hasJumped = true;
          } else {
            if (target.color !== piece.color) {
              moves.push({ x: newX, y: newY });
            }
            break;
          }
        } else if (!hasJumped) {
          moves.push({ x: newX, y: newY });
        }
      }
    });
    return moves;
  }

  /**
   * 獲取兵卒的可能移動
   * 過河前只能向前，過河後可橫向移動
   */
  static getSoldierMoves(piece: ChessPiece, board: (ChessPiece | null)[][]): Position[] {
    const moves: Position[] = [];
    const { x, y } = piece.position;
    const forward = piece.color === PlayerColor.RED ? -1 : 1;
    const forwardMove = { x, y: y + forward };

    // 向前走
    if (this.isValidMoveForPiece(forwardMove, piece, board)) {
      moves.push(forwardMove);
    }

    // 過河後可橫走
    if (!this.isOnOwnSide(y, piece.color)) {
      const sideMoves = [
        { x: x - 1, y },
        { x: x + 1, y },
      ];
      sideMoves.forEach((move) => {
        if (this.isValidMoveForPiece(move, piece, board)) {
          moves.push(move);
        }
      });
    }

    return moves;
  }

  /**
   * 根據棋子類型獲取其可能移動
   * 統一的入口方法
   */
  static getPieceMoves(
    piece: ChessPiece,
    board: (ChessPiece | null)[][],
    checkKingFacing: boolean = true,
    wouldMoveCreateKingFacing?: (piece: ChessPiece, move: Position, board: (ChessPiece | null)[][]) => boolean
  ): Position[] {
    switch (piece.type) {
      case PieceType.KING:
        return this.getKingMoves(piece, board, checkKingFacing, wouldMoveCreateKingFacing);
      case PieceType.ADVISOR:
        return this.getAdvisorMoves(piece, board);
      case PieceType.ELEPHANT:
        return this.getElephantMoves(piece, board);
      case PieceType.HORSE:
        return this.getHorseMoves(piece, board);
      case PieceType.ROOK:
        return this.getRookMoves(piece, board);
      case PieceType.CANNON:
        return this.getCannonMoves(piece, board);
      case PieceType.SOLDIER:
        return this.getSoldierMoves(piece, board);
      default:
        return [];
    }
  }
}
