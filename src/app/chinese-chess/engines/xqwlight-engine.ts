/**
 * XQWLight-inspired JavaScript Chinese Chess Engine
 * 基於 XQWLight 算法的純前端象棋引擎
 *
 * 核心特色：
 * - Alpha-Beta 搜索算法
 * - 位置價值表評估
 * - 移動排序優化
 * - 純前端運行，無需後端
 */

import { PlayerColor, Position, GameState, ChessPiece, PieceType } from '../chess-piece.interface';
import { PIECE_VALUES, getPieceValue } from '../chess-values';

export interface XQWLightMove {
  from: Position;
  to: Position;
  score: number;
  depth: number;
  nodes: number;
  time: number;
}

// 棋子類型對應表
const PIECE_TYPE_MAP = {
  [PieceType.KING]: PieceType.KING,
  [PieceType.ADVISOR]: PieceType.ADVISOR,
  [PieceType.ELEPHANT]: PieceType.ELEPHANT,
  [PieceType.HORSE]: PieceType.HORSE,
  [PieceType.ROOK]: PieceType.ROOK,
  [PieceType.CANNON]: PieceType.CANNON,
  [PieceType.SOLDIER]: PieceType.SOLDIER
} as const;

export class XQWLightEngine {
  private maxDepth = 4;
  private maxTime = 3000; // 最大思考時間 (毫秒)
  private nodeCount = 0;
  private startTime = 0;

  // 設置搜索深度和時間限制
  setDifficulty(level: number): void {
    // level: 1-10
    this.maxDepth = Math.max(2, Math.min(8, Math.floor(level * 0.8) + 2));
    this.maxTime = Math.max(1000, Math.min(8000, level * 800));
    console.log(`🧠 XQWLight 引擎難度設置: 深度=${this.maxDepth}, 時間=${this.maxTime}ms`);
  }

  // 主要的移動搜索函數
  async searchBestMove(gameState: GameState): Promise<XQWLightMove | null> {
    console.log(`🧠 XQWLight 引擎開始分析 (深度${this.maxDepth}, 時間${this.maxTime}ms)...`);

    this.startTime = Date.now();
    this.nodeCount = 0;

    try {
      const result = await this.alphaBetaSearch(
        gameState,
        this.maxDepth,
        -999999,
        999999,
        true // BLACK 是最大化玩家
      );

      const elapsed = Date.now() - this.startTime;

      if (result) {
        console.log(`✅ XQWLight 分析完成: ${elapsed}ms, ${this.nodeCount} 節點, 評分=${result.score}`);
        return {
          from: result.from,
          to: result.to,
          score: result.score,
          depth: this.maxDepth,
          nodes: this.nodeCount,
          time: elapsed
        };
      }

      return null;
    } catch (error) {
      console.error('❌ XQWLight 引擎搜索失敗:', error);
      return null;
    }
  }

  // Alpha-Beta 搜索算法 (XQWLight 核心)
  private async alphaBetaSearch(
    gameState: GameState,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizingPlayer: boolean
  ): Promise<{ from: Position; to: Position; score: number } | null> {

    this.nodeCount++;

    // 時間限制檢查
    if (Date.now() - this.startTime > this.maxTime) {
      return null;
    }

    // 達到搜索深度，返回評估分數
    if (depth === 0) {
      const score = this.evaluatePosition(gameState);
      return { from: { x: 0, y: 0 }, to: { x: 0, y: 0 }, score };
    }

    const currentColor = isMaximizingPlayer ? PlayerColor.BLACK : PlayerColor.RED;
    const moves = this.generateAllMoves(gameState, currentColor);

    if (moves.length === 0) {
      // 無移動可走 - 可能是將死或和棋
      const score = this.isInCheck(gameState, currentColor) ?
        (isMaximizingPlayer ? -999999 : 999999) : 0;
      return { from: { x: 0, y: 0 }, to: { x: 0, y: 0 }, score };
    }

    // 移動排序 - XQWLight 的重要優化
    const sortedMoves = this.orderMoves(gameState, moves);

    let bestMove: { from: Position; to: Position } | null = null;

    if (isMaximizingPlayer) {
      let maxEval = -999999;

      for (const move of sortedMoves) {
        const newState = this.makeMove(gameState, move.from, move.to);

        // 檢查移動是否合法 (不會讓自己被將軍)
        if (this.isInCheck(newState, currentColor)) {
          continue;
        }

        const result = await this.alphaBetaSearch(newState, depth - 1, alpha, beta, false);

        if (result && result.score > maxEval) {
          maxEval = result.score;
          bestMove = move;
        }

        alpha = Math.max(alpha, maxEval);
        if (beta <= alpha) {
          break; // Beta cutoff
        }
      }

      return bestMove ? { ...bestMove, score: maxEval } : null;

    } else {
      let minEval = 999999;

      for (const move of sortedMoves) {
        const newState = this.makeMove(gameState, move.from, move.to);

        // 檢查移動是否合法
        if (this.isInCheck(newState, currentColor)) {
          continue;
        }

        const result = await this.alphaBetaSearch(newState, depth - 1, alpha, beta, true);

        if (result && result.score < minEval) {
          minEval = result.score;
          bestMove = move;
        }

        beta = Math.min(beta, minEval);
        if (beta <= alpha) {
          break; // Alpha cutoff
        }
      }

      return bestMove ? { ...bestMove, score: minEval } : null;
    }
  }

  // 位置評估函數 (使用 chess-values.ts 的完整評估表)
  private evaluatePosition(gameState: GameState): number {
    let score = 0;

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = gameState.board[y][x];
        if (!piece) continue;

        const pieceType = this.getPieceType(piece);
        const pieceValue = getPieceValue(pieceType, x, y, piece.color);

        if (piece.color === PlayerColor.BLACK) {
          score += pieceValue;
        } else {
          score -= pieceValue;
        }
      }
    }

    // 添加機動性評估
    const blackMoves = this.generateAllMoves(gameState, PlayerColor.BLACK).length;
    const redMoves = this.generateAllMoves(gameState, PlayerColor.RED).length;
    score += (blackMoves - redMoves) * 5;

    // 將軍懲罰/獎勵
    if (this.isInCheck(gameState, PlayerColor.BLACK)) {
      score -= 200;
    }
    if (this.isInCheck(gameState, PlayerColor.RED)) {
      score += 200;
    }

    return score;
  }

  // 移動排序 (提升 Alpha-Beta 效率)
  private orderMoves(
    gameState: GameState,
    moves: { from: Position; to: Position }[]
  ): { from: Position; to: Position }[] {

    return moves.sort((a, b) => {
      let scoreA = 0, scoreB = 0;

      // 吃子移動優先
      const targetA = gameState.board[a.to.y][a.to.x];
      const targetB = gameState.board[b.to.y][b.to.x];

      if (targetA) {
        const targetTypeA = this.getPieceType(targetA);
        scoreA += PIECE_VALUES[targetTypeA] + 1000;
      }
      if (targetB) {
        const targetTypeB = this.getPieceType(targetB);
        scoreB += PIECE_VALUES[targetTypeB] + 1000;
      }

      // 將軍移動優先
      const testStateA = this.makeMove(gameState, a.from, a.to);
      const testStateB = this.makeMove(gameState, b.from, b.to);

      if (this.isInCheck(testStateA, PlayerColor.RED)) scoreA += 500;
      if (this.isInCheck(testStateB, PlayerColor.RED)) scoreB += 500;

      return scoreB - scoreA;
    });
  }

  // 輔助方法 - 獲取棋子類型
  private getPieceType(piece: ChessPiece): PieceType {
    return piece.type;
  }

  // 生成所有合法移動 (依賴 ChessGameService)
  private generateAllMoves(gameState: GameState, color: PlayerColor): { from: Position; to: Position }[] {
    const moves: { from: Position; to: Position }[] = [];

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = gameState.board[y][x];
        if (piece && piece.color === color) {
          try {
            // 使用現有的象棋服務獲取可能移動
            const possibleMoves = this.chessGameService?.getPossibleMoves(piece, gameState.board) || [];
            for (const moveTo of possibleMoves) {
              moves.push({ from: piece.position, to: moveTo });
            }
          } catch (error) {
            console.warn(`獲取棋子 ${piece.type} 移動失敗:`, error);
          }
        }
      }
    }

    return moves;
  }

  // 模擬移動
  private makeMove(gameState: GameState, from: Position, to: Position): GameState {
    const newBoard = gameState.board.map(row => [...row]);
    const piece = newBoard[from.y][from.x];

    newBoard[from.y][from.x] = null;
    if (piece) {
      newBoard[to.y][to.x] = {
        ...piece,
        position: { x: to.x, y: to.y },
        hasMoved: true
      };
    }

    return { ...gameState, board: newBoard };
  }

  // 檢查是否被將軍 (依賴 ChessGameService)
  private isInCheck(gameState: GameState, color: PlayerColor): boolean {
    try {
      return this.chessGameService?.isInCheck(gameState.board, color) || false;
    } catch (error) {
      console.warn('檢查將軍狀態失敗:', error);
      return false;
    }
  }

  // 注入 ChessGameService
  private chessGameService: any;

  constructor(chessGameService: any) {
    this.chessGameService = chessGameService;
  }
}