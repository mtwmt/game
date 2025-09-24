import { Injectable } from '@angular/core';
import {
  ChessPiece,
  PieceType,
  PlayerColor,
  Position,
  MoveResult,
  GameState,
} from './chess-piece.interface';

interface BoardCache {
  kingPositions: Map<PlayerColor, Position>;
  piecesByColor: Map<PlayerColor, ChessPiece[]>;
  lastMoveCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class ChessGameService {
  private boardCache: BoardCache = {
    kingPositions: new Map(),
    piecesByColor: new Map(),
    lastMoveCount: -1
  };

  private moveCache = new Map<string, Position[]>();
  
  // 常用方向常數
  private readonly ORTHOGONAL_DIRECTIONS = [
    { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
    { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
  ];
  
  private readonly DIAGONAL_DIRECTIONS = [
    { dx: -1, dy: -1 }, { dx: 1, dy: -1 },
    { dx: -1, dy: 1 }, { dx: 1, dy: 1 }
  ];
  initializeBoard(): (ChessPiece | null)[][] {
    const board: (ChessPiece | null)[][] = Array(10)
      .fill(null)
      .map(() => Array(9).fill(null));

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
      board: this.initializeBoard(),
      currentPlayer: PlayerColor.RED,
      selectedPiece: null,
      validMoves: [],
      gameOver: false,
      winner: null,
      moveHistory: [],
      isInCheck: false,
      isSelfInCheck: false,
      isVsAI: false,
      aiIsThinking: false,
      aiThinkingText: '',
    };
  }

  isValidPosition(x: number, y: number): boolean {
    return x >= 0 && x < 9 && y >= 0 && y < 10;
  }

  isInPalace(x: number, y: number, color: PlayerColor): boolean {
    if (color === PlayerColor.RED) {
      return x >= 3 && x <= 5 && y >= 7 && y <= 9;
    } else {
      return x >= 3 && x <= 5 && y >= 0 && y <= 2;
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

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
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
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
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
    const cacheKey = `${piece.id}-${piece.position.x}-${piece.position.y}-true`;
    
    if (this.moveCache.has(cacheKey)) {
      return this.moveCache.get(cacheKey)!;
    }
    
    const moves = this.calculatePieceMoves(piece, board, true);
    this.moveCache.set(cacheKey, moves);
    return moves;
  }

  getPossibleMovesForCheck(piece: ChessPiece, board: (ChessPiece | null)[][]): Position[] {
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
    const kingMoves = this.ORTHOGONAL_DIRECTIONS.map(dir => ({
      x: x + dir.dx,
      y: y + dir.dy
    }));

    return kingMoves.filter(move => {
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
    const advisorMoves = this.DIAGONAL_DIRECTIONS.map(dir => ({
      x: x + dir.dx,
      y: y + dir.dy
    }));

    return advisorMoves.filter(move =>
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

    return enemyPieces.some(piece => {
      const moves = this.getPossibleMovesForCheck(piece, board);
      return moves.some(move => move.x === kingPos.x && move.y === kingPos.y);
    });
  }

  makeMove(gameState: GameState, from: Position, to: Position): MoveResult {
    const { board, moveHistory } = gameState;
    const piece = board[from.y][from.x];

    if (!piece) {
      return { success: false };
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
        isCheck: false,
        gameOver: true,
        winner: piece.color,
      };
    }

    // 檢查王見王情況 - 移動方立即輸掉遊戲
    if (this.wouldKingsFaceEachOther(board, moveCount + 1)) {
      piece.hasMoved = true;
      return {
        success: true,
        captured: targetPiece || undefined,
        isCheck: false,
        gameOver: true,
        winner: piece.color === PlayerColor.RED ? PlayerColor.BLACK : PlayerColor.RED,
      };
    }

    // 檢查是否將軍對方
    const oppositeColor = piece.color === PlayerColor.RED ? PlayerColor.BLACK : PlayerColor.RED;
    const isCheck = this.isInCheck(board, oppositeColor, moveCount + 1);

    // 檢查自己是否被將軍（用於提醒玩家）
    const isSelfInCheck = this.isInCheck(board, piece.color, moveCount + 1);

    piece.hasMoved = true;

    return {
      success: true,
      captured: targetPiece || undefined,
      isCheck,
      isSelfInCheck,
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
}
