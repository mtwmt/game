import { Injectable, signal } from '@angular/core';
import {
  ChessPiece,
  PieceType,
  PlayerColor,
  Position,
  MoveResult,
  GameState,
} from './chess-piece.interface';
import { GAME_CONSTANTS } from './chess-values';

// 簡單的 LRU 快取實現
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private readonly maxSize: number;

  constructor(maxSize: number = GAME_CONSTANTS.CACHE_SIZE) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // 重新插入以更新順序
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 刪除最久未使用的項目
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

interface BoardCache {
  kingPositions: Map<PlayerColor, Position>;
  piecesByColor: Map<PlayerColor, ChessPiece[]>;
  lastMoveCount: number;
}

export const initialState: GameState = {
  board: [],
  currentPlayer: PlayerColor.RED,
  selectedPiece: null,
  validMoves: [],
  status: {
    gameOver: false,
    winner: null,
    isInCheck: false,
    isCheckmate: false,
    isStalemate: false,
  },
  moveHistory: [],
  isVsAI: true,
  aiState: {
    isThinking: false,
    thinkingText: '',
  },
  hasApiKey: false,
};
@Injectable({
  providedIn: 'root',
})
export class ChessGameService {

  // 統一的 API Key 狀態管理
  hasApiKey = signal(false);

  private boardCache: BoardCache = {
    kingPositions: new Map(),
    piecesByColor: new Map(),
    lastMoveCount: -1,
  };

  constructor() {
    this.updateApiKeyStatus();
  }

  private moveCache = new LRUCache<string, Position[]>(GAME_CONSTANTS.CACHE_SIZE);

  // 添加邊界檢查工具方法
  private validatePosition(x: number, y: number, context: string = 'position'): void {
    if (!this.isValidPosition(x, y)) {
      throw new Error(`Invalid chess ${context}: (${x}, ${y}). Valid range: x[0-8], y[0-9]`);
    }
  }

  private validateBoard(board: (ChessPiece | null)[][]): void {
    if (!board || board.length !== GAME_CONSTANTS.BOARD_HEIGHT) {
      throw new Error(`Invalid board height: expected ${GAME_CONSTANTS.BOARD_HEIGHT}`);
    }
    for (let y = 0; y < board.length; y++) {
      if (!board[y] || board[y].length !== GAME_CONSTANTS.BOARD_WIDTH) {
        throw new Error(
          `Invalid board width at row ${y}: expected ${GAME_CONSTANTS.BOARD_WIDTH}`
        );
      }
    }
  }

  // 常用方向常數
  private readonly ORTHOGONAL_DIRECTIONS = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  private readonly DIAGONAL_DIRECTIONS = [
    { dx: -1, dy: -1 },
    { dx: 1, dy: -1 },
    { dx: -1, dy: 1 },
    { dx: 1, dy: 1 },
  ];
  initializeBoard(): (ChessPiece | null)[][] {
    const board: (ChessPiece | null)[][] = Array(GAME_CONSTANTS.BOARD_HEIGHT)
      .fill(null)
      .map(() => Array(GAME_CONSTANTS.BOARD_WIDTH).fill(null));

    this.setupInitialPieces(board);
    return board;
  }

  private setupInitialPieces(board: (ChessPiece | null)[][]): void {
    // 紅方後排
    const redBackRow: PieceType[] = [
      PieceType.ROOK,
      PieceType.HORSE,
      PieceType.ELEPHANT,
      PieceType.ADVISOR,
      PieceType.KING,
      PieceType.ADVISOR,
      PieceType.ELEPHANT,
      PieceType.HORSE,
      PieceType.ROOK,
    ];
    redBackRow.forEach((type, x) => {
      const id = this.generatePieceId(type, PlayerColor.RED, x);
      board[9][x] = this.createPiece(id, type, PlayerColor.RED, x, 9);
    });

    // 黑方後排
    const blackBackRow: PieceType[] = [...redBackRow];
    blackBackRow.forEach((type, x) => {
      const id = this.generatePieceId(type, PlayerColor.BLACK, x);
      board[0][x] = this.createPiece(id, type, PlayerColor.BLACK, x, 0);
    });

    // 砲
    [1, 7].forEach((x, index) => {
      board[7][x] = this.createPiece(
        `r-cannon-${index + 1}`,
        PieceType.CANNON,
        PlayerColor.RED,
        x,
        7
      );
      board[2][x] = this.createPiece(
        `b-cannon-${index + 1}`,
        PieceType.CANNON,
        PlayerColor.BLACK,
        x,
        2
      );
    });

    // 兵/卒
    for (let x = 0; x < 9; x += 2) {
      board[6][x] = this.createPiece(`r-soldier-${x}`, PieceType.SOLDIER, PlayerColor.RED, x, 6);
      board[3][x] = this.createPiece(`b-soldier-${x}`, PieceType.SOLDIER, PlayerColor.BLACK, x, 3);
    }
  }

  private generatePieceId(type: PieceType, color: PlayerColor, position: number): string {
    const prefix = color === PlayerColor.RED ? 'r' : 'b';
    if (type === PieceType.KING) return `${prefix}-king`;
    return `${prefix}-${type}-${position < 4 ? '1' : '2'}`;
  }

  private createPiece(
    id: string,
    type: PieceType,
    color: PlayerColor,
    x: number,
    y: number
  ): ChessPiece {
    return {
      id,
      type,
      color,
      position: { x, y },
      isSelected: false,
      hasMoved: false,
    };
  }

  initializeGameState(): GameState {
    return {
      ...initialState,
      board: this.initializeBoard(),
      hasApiKey: this.checkHasApiKey(),
    };
  }

  isValidPosition(x: number, y: number): boolean {
    return (
      x >= 0 && x < GAME_CONSTANTS.BOARD_WIDTH && y >= 0 && y < GAME_CONSTANTS.BOARD_HEIGHT
    );
  }

  isInPalace(x: number, y: number, color: PlayerColor): boolean {
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

  isOnOwnSide(y: number, color: PlayerColor): boolean {
    if (color === PlayerColor.RED) {
      return y >= 5;
    } else {
      return y <= 4;
    }
  }

  wouldKingsFaceEachOther(board: (ChessPiece | null)[][], moveCount: number = 0): boolean {
    this.updateBoardCache(board, moveCount);

    const redKing = this.boardCache.kingPositions.get(PlayerColor.RED);
    const blackKing = this.boardCache.kingPositions.get(PlayerColor.BLACK);

    if (!redKing || !blackKing) return false;
    if (redKing.x !== blackKing.x) return false;

    return this.isPathClear(board, redKing, blackKing);
  }

  private isPathClear(board: (ChessPiece | null)[][], from: Position, to: Position): boolean {
    const minY = Math.min(from.y, to.y);
    const maxY = Math.max(from.y, to.y);

    for (let y = minY + 1; y < maxY; y++) {
      if (board[y][from.x] !== null) {
        return false;
      }
    }

    return true;
  }

  private updateBoardCache(board: (ChessPiece | null)[][], moveCount: number): void {
    if (this.boardCache.lastMoveCount === moveCount) return;

    this.boardCache.kingPositions.clear();
    this.boardCache.piecesByColor.clear();
    this.boardCache.piecesByColor.set(PlayerColor.RED, []);
    this.boardCache.piecesByColor.set(PlayerColor.BLACK, []);

    for (let y = 0; y < GAME_CONSTANTS.BOARD_HEIGHT; y++) {
      for (let x = 0; x < GAME_CONSTANTS.BOARD_WIDTH; x++) {
        const piece = board[y][x];
        if (piece) {
          this.boardCache.piecesByColor.get(piece.color)!.push(piece);
          if (piece.type === PieceType.KING) {
            this.boardCache.kingPositions.set(piece.color, { x, y });
          }
        }
      }
    }

    this.boardCache.lastMoveCount = moveCount;
  }

  private clearCaches(): void {
    this.moveCache.clear();
    this.boardCache.lastMoveCount = -1;
  }

  private getBoardHash(board: (ChessPiece | null)[][]): string {
    let hash = '';
    for (let y = 0; y < GAME_CONSTANTS.BOARD_HEIGHT; y++) {
      for (let x = 0; x < GAME_CONSTANTS.BOARD_WIDTH; x++) {
        const piece = board[y][x];
        hash += piece ? `${piece.type}${piece.color}${x}${y}` : 'e';
      }
    }
    return hash;
  }

  private isValidMoveForPiece(
    move: Position,
    piece: ChessPiece,
    board: (ChessPiece | null)[][]
  ): boolean {
    if (!this.isValidPosition(move.x, move.y)) return false;

    const target = board[move.y][move.x];
    return !target || target.color !== piece.color;
  }

  private getSlidingPieceMoves(
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

  getPossibleMoves(piece: ChessPiece, board: (ChessPiece | null)[][]): Position[] {
    if (!piece) {
      throw new Error('Cannot get possible moves for null piece');
    }
    this.validateBoard(board);
    this.validatePosition(piece.position.x, piece.position.y, 'piece position');

    const cacheKey = `${piece.id}-${piece.position.x}-${piece.position.y}-true`;

    if (this.moveCache.has(cacheKey)) {
      return this.moveCache.get(cacheKey)!;
    }

    const moves = this.calculatePieceMoves(piece, board, true);
    this.moveCache.set(cacheKey, moves);
    return moves;
  }

  getPossibleMovesForCheck(piece: ChessPiece, board: (ChessPiece | null)[][]): Position[] {
    if (!piece) {
      throw new Error('Cannot get possible moves for null piece');
    }
    this.validateBoard(board);
    this.validatePosition(piece.position.x, piece.position.y, 'piece position');

    const cacheKey = `${piece.id}-${piece.position.x}-${piece.position.y}-false`;

    if (this.moveCache.has(cacheKey)) {
      return this.moveCache.get(cacheKey)!;
    }

    const moves = this.calculatePieceMoves(piece, board, false);
    this.moveCache.set(cacheKey, moves);
    return moves;
  }

  private calculatePieceMoves(
    piece: ChessPiece,
    board: (ChessPiece | null)[][],
    checkKingFacing: boolean
  ): Position[] {
    switch (piece.type) {
      case PieceType.KING:
        return this.getKingMoves(piece, board, checkKingFacing);
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

  private getKingMoves(
    piece: ChessPiece,
    board: (ChessPiece | null)[][],
    checkKingFacing: boolean
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

      return !checkKingFacing || !this.wouldMoveCreateKingFacing(piece, move, board);
    });
  }

  private wouldMoveCreateKingFacing(
    piece: ChessPiece,
    move: Position,
    board: (ChessPiece | null)[][]
  ): boolean {
    const originalPiece = board[move.y][move.x];
    const originalPos = piece.position;

    // 模擬移動
    board[move.y][move.x] = piece;
    board[originalPos.y][originalPos.x] = null;
    piece.position = move;

    const result = this.wouldKingsFaceEachOther(board);

    // 還原棋盤
    board[originalPos.y][originalPos.x] = piece;
    board[move.y][move.x] = originalPiece;
    piece.position = originalPos;

    return result;
  }

  private getAdvisorMoves(piece: ChessPiece, board: (ChessPiece | null)[][]): Position[] {
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

  private getElephantMoves(piece: ChessPiece, board: (ChessPiece | null)[][]): Position[] {
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

  private getHorseMoves(piece: ChessPiece, board: (ChessPiece | null)[][]): Position[] {
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

  private getRookMoves(piece: ChessPiece, board: (ChessPiece | null)[][]): Position[] {
    return this.getSlidingPieceMoves(piece, board, this.ORTHOGONAL_DIRECTIONS);
  }

  private getCannonMoves(piece: ChessPiece, board: (ChessPiece | null)[][]): Position[] {
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

  private getSoldierMoves(piece: ChessPiece, board: (ChessPiece | null)[][]): Position[] {
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

  isInCheck(board: (ChessPiece | null)[][], color: PlayerColor, moveCount: number = 0): boolean {
    this.updateBoardCache(board, moveCount);

    const kingPos = this.boardCache.kingPositions.get(color);
    if (!kingPos) return false;

    const enemyColor = color === PlayerColor.RED ? PlayerColor.BLACK : PlayerColor.RED;
    const enemyPieces = this.boardCache.piecesByColor.get(enemyColor) || [];

    return enemyPieces.some((piece) => {
      const moves = this.getPossibleMovesForCheck(piece, board);
      return moves.some((move) => move.x === kingPos.x && move.y === kingPos.y);
    });
  }

  makeMove(gameState: GameState, from: Position, to: Position): MoveResult {
    this.validatePosition(from.x, from.y, 'source position');
    this.validatePosition(to.x, to.y, 'target position');
    this.validateBoard(gameState.board);

    const { board, moveHistory } = gameState;
    const piece = board[from.y][from.x];

    if (!piece) {
      return {
        success: false,
        status: {
          gameOver: false,
          winner: null,
          isInCheck: false,
          isCheckmate: false,
          isStalemate: false,
        },
      };
    }

    const targetPiece = board[to.y][to.x];
    const moveCount = moveHistory.length;

    // 清除快取因為棋盤即將改變
    this.clearCaches();

    // 執行移動
    board[to.y][to.x] = piece;
    board[from.y][from.x] = null;
    piece.position = to;

    // 檢查是否吃掉對方的王 - 遊戲結束
    if (targetPiece && targetPiece.type === PieceType.KING) {
      piece.hasMoved = true;
      return {
        success: true,
        captured: targetPiece,
        status: {
          gameOver: true,
          winner: piece.color,
          isInCheck: false,
          isCheckmate: true,
          isStalemate: false,
        },
      };
    }

    // 檢查王見王情況 - 移動方立即輸掉遊戲
    if (this.wouldKingsFaceEachOther(board, moveCount + 1)) {
      piece.hasMoved = true;
      return {
        success: true,
        captured: targetPiece || undefined,
        status: {
          gameOver: true,
          winner: piece.color === PlayerColor.RED ? PlayerColor.BLACK : PlayerColor.RED,
          isInCheck: false,
          isCheckmate: true,
          isStalemate: false,
        },
      };
    }

    // 檢查是否將軍對方
    const oppositeColor = piece.color === PlayerColor.RED ? PlayerColor.BLACK : PlayerColor.RED;
    const isCheck = this.isInCheck(board, oppositeColor, moveCount + 1);

    // 檢查自己是否被將軍（用於提醒玩家）
    const isSelfInCheck = this.isInCheck(board, piece.color, moveCount + 1);

    piece.hasMoved = true;

    // 檢查是否將死或困斃
    const isCheckmate = isCheck ? this.isCheckmate(board, oppositeColor) : false;
    const isStalemate = !isCheck ? this.isStalemate(board, oppositeColor) : false;

    return {
      success: true,
      captured: targetPiece || undefined,
      status: {
        gameOver: isCheckmate || isStalemate,
        winner: isCheckmate ? piece.color : null,
        isInCheck: isCheck,
        isCheckmate,
        isStalemate,
      },
    };
  }

  getPieceSymbol(piece: ChessPiece): string {
    const symbols: Record<PieceType, { red: string; black: string }> = {
      [PieceType.KING]: { red: '帥', black: '將' },
      [PieceType.ADVISOR]: { red: '仕', black: '士' },
      [PieceType.ELEPHANT]: { red: '相', black: '象' },
      [PieceType.HORSE]: { red: '馬', black: '馬' },
      [PieceType.ROOK]: { red: '車', black: '車' },
      [PieceType.CANNON]: { red: '炮', black: '砲' },
      [PieceType.SOLDIER]: { red: '兵', black: '卒' },
    };

    return symbols[piece.type][piece.color];
  }

  checkHasApiKey(): boolean {
    if (typeof localStorage !== 'undefined') {
      const apiKey = localStorage.getItem('gemini-api-key');
      return !!apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE';
    }
    return false;
  }

  updateApiKeyStatus(): void {
    const hasKey = this.checkHasApiKey();
    this.hasApiKey.set(hasKey);
  }

  /**
   * 檢查是否為平局（無子可動）
   */
  isStalemate(board: (ChessPiece | null)[][], color: PlayerColor): boolean {
    // 如果處於將軍狀態，不是平局而是將死
    if (this.isInCheck(board, color)) {
      return false;
    }

    // 檢查是否有任何合法移動
    for (let y = 0; y < GAME_CONSTANTS.BOARD_HEIGHT; y++) {
      for (let x = 0; x < GAME_CONSTANTS.BOARD_WIDTH; x++) {
        const piece = board[y][x];
        if (piece && piece.color === color) {
          const moves = this.getPossibleMoves(piece, board);
          if (moves.length > 0) {
            return false; // 有合法移動，不是平局
          }
        }
      }
    }

    return true; // 無子可動，平局
  }

  /**
   * 檢查是否為將死
   */
  isCheckmate(board: (ChessPiece | null)[][], color: PlayerColor): boolean {
    // 必須處於將軍狀態
    if (!this.isInCheck(board, color)) {
      return false;
    }

    // 檢查是否有任何合法移動能解除將軍
    for (let y = 0; y < GAME_CONSTANTS.BOARD_HEIGHT; y++) {
      for (let x = 0; x < GAME_CONSTANTS.BOARD_WIDTH; x++) {
        const piece = board[y][x];
        if (piece && piece.color === color) {
          const moves = this.getPossibleMoves(piece, board);
          for (const move of moves) {
            // 模擬移動
            const originalPiece = board[move.y][move.x];
            board[move.y][move.x] = piece;
            board[y][x] = null;
            piece.position = move;

            // 檢查移動後是否仍然被將軍
            const stillInCheck = this.isInCheck(board, color);

            // 還原移動
            board[y][x] = piece;
            board[move.y][move.x] = originalPiece;
            piece.position = { x, y };

            if (!stillInCheck) {
              return false; // 找到解除將軍的移動
            }
          }
        }
      }
    }

    return true; // 無法解除將軍，將死
  }

  /**
   * 檢查長將（連續將軍）規則
   */
  isPerpetualCheck(moveHistory: string[], maxRepeats: number = 3): boolean {
    if (moveHistory.length < maxRepeats * 2) {
      return false;
    }

    const recentMoves = moveHistory.slice(-maxRepeats * 2);
    const pattern = recentMoves.slice(0, 2);

    // 檢查是否重複相同的兩步移動
    for (let i = 2; i < recentMoves.length; i += 2) {
      if (recentMoves[i] !== pattern[0] || recentMoves[i + 1] !== pattern[1]) {
        return false;
      }
    }

    return true;
  }
}
