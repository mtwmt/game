import { Injectable, inject } from '@angular/core';
import { BaseAIStrategy, AIStrategyResult } from './base-ai-strategy';
import { PlayerColor, Position, GameState, ChessPiece, PieceType } from '../chess-piece.interface';
import { ChessGameService } from '../chess-game.service';
import {
  PIECE_VALUES,
  getPieceValue,
  XQWLIGHT_CONFIG,
  MOVE_ORDER_WEIGHTS,
  evaluateKingSafety,
  evaluatePawnAdvancement,
  evaluateMobility,
} from '../chess-values';

interface MoveScore {
  move: { from: Position; to: Position };
  score: number;
}

@Injectable({
  providedIn: 'root',
})
export class XQWLightStrategy extends BaseAIStrategy {
  readonly name = 'XQWLight 專業引擎';
  readonly priority = 1; // 最高優先級

  private chessGameService = inject(ChessGameService);
  private searchDepth = XQWLIGHT_CONFIG.DEPTHS.medium;
  private startTime = 0;
  private nodeCount = 0;

  // 殺手移動表和歷史表
  private killerMoves: Map<number, Array<{ from: Position; to: Position }>> = new Map();
  private historyTable: Map<string, number> = new Map();

  async isAvailable(): Promise<boolean> {
    return true; // 總是可用
  }

  async makeMove(gameState: GameState): Promise<AIStrategyResult | null> {
    console.log(`🔥 使用 XQWLight 專業引擎 (深度${this.searchDepth})...`);
    this.startTime = Date.now();
    this.nodeCount = 0;

    try {
      const result = this.searchRoot(gameState, this.searchDepth);
      const elapsed = Date.now() - this.startTime;

      if (result) {
        console.log(
          `🏆 XQWLight 分析完成: ${elapsed}ms, 搜索${this.nodeCount}個節點, 評分=${result.score}`
        );
        console.log(
          `🎯 選擇移動: (${result.move.from.x},${result.move.from.y}) -> (${result.move.to.x},${result.move.to.y})`
        );

        return {
          from: result.move.from,
          to: result.move.to,
          score: result.score,
          analysis: `XQWLight 專業引擎 深度${this.searchDepth}, ${this.nodeCount}節點, ${elapsed}ms`,
        };
      }

      // 如果搜尋失敗，使用簡單策略
      console.warn('⚠️ XQWLight 搜索失敗，使用簡單策略');
      const fallbackMove = this.getFallbackMove(gameState);
      if (fallbackMove) {
        return {
          from: fallbackMove.from,
          to: fallbackMove.to,
          score: 0,
          analysis: 'XQWLight 備用策略',
        };
      }

      return null;
    } catch (error) {
      console.error('❌ XQWLight 策略執行失敗:', error);
      return null;
    }
  }

  getThinkingDescription(): string {
    return `🔥 XQWLight 專業引擎正在深度分析 (${this.searchDepth}層)...`;
  }

  setDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
    this.searchDepth = XQWLIGHT_CONFIG.DEPTHS[difficulty];
    console.log(`🔥 XQWLight 引擎難度設置: ${difficulty} (深度=${this.searchDepth})`);
  }

  // ==========================================
  // XQWLight 核心搜尋算法
  // ==========================================

  private searchRoot(gameState: GameState, depth: number): MoveScore | null {
    const aiColor = PlayerColor.BLACK; // AI 總是黑方
    const moves = this.generateAllMoves(gameState, aiColor);
    if (moves.length === 0) return null;

    // XQWLight 移動排序
    const sortedMoves = this.orderMoves(gameState, moves, depth);

    let bestMove: { from: Position; to: Position } | null = null;
    let bestScore = -XQWLIGHT_CONFIG.INFINITY;

    for (const move of sortedMoves) {
      // 檢查時間限制
      if (Date.now() - this.startTime > XQWLIGHT_CONFIG.MAX_TIME) {
        break;
      }

      const newState = this.simulateMove(gameState, move);

      // 檢查是否會讓自己被將軍 - 使用正確的移動計數
      if (this.chessGameService.isInCheck(newState.board, aiColor, gameState.moveHistory.length + 1)) {
        continue;
      }

      const score = -this.alphaBetaSearch(
        newState,
        depth - 1,
        -XQWLIGHT_CONFIG.INFINITY,
        XQWLIGHT_CONFIG.INFINITY,
        false
      );

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove ? { move: bestMove, score: bestScore } : null;
  }

  private alphaBetaSearch(
    gameState: GameState,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean
  ): number {
    this.nodeCount++;

    // 檢查時間限制
    if (Date.now() - this.startTime > XQWLIGHT_CONFIG.MAX_TIME) {
      return this.evaluatePosition(gameState);
    }

    // 達到搜索深度
    if (depth <= 0) {
      return this.evaluatePosition(gameState);
    }

    const currentColor = isMaximizing ? PlayerColor.BLACK : PlayerColor.RED;
    const moves = this.generateAllMoves(gameState, currentColor);

    // 無移動可走 - 檢查是否將死
    if (moves.length === 0) {
      const currentMoveCount = gameState.moveHistory.length;
      const inCheck = this.chessGameService.isInCheck(gameState.board, currentColor, currentMoveCount);
      if (inCheck) {
        return isMaximizing ? -XQWLIGHT_CONFIG.MATE_VALUE : XQWLIGHT_CONFIG.MATE_VALUE;
      }
      return 0; // 和棋
    }

    const sortedMoves = this.orderMoves(gameState, moves, depth);

    if (isMaximizing) {
      let maxEval = -XQWLIGHT_CONFIG.INFINITY;

      for (const move of sortedMoves) {
        const newState = this.simulateMove(gameState, move);

        // 跳過會讓自己被將軍的移動 - 使用正確的移動計數
        if (this.chessGameService.isInCheck(newState.board, currentColor, gameState.moveHistory.length + depth)) {
          continue;
        }

        const evaluation = this.alphaBetaSearch(newState, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);

        if (beta <= alpha) {
          // 記錄殺手移動和歷史表
          this.recordKillerMove(depth, move);
          this.updateHistoryTable(move, depth);
          break; // Beta cutoff
        }
      }

      return maxEval;
    } else {
      let minEval = XQWLIGHT_CONFIG.INFINITY;

      for (const move of sortedMoves) {
        const newState = this.simulateMove(gameState, move);

        // 跳過會讓自己被將軍的移動 - 使用正確的移動計數
        if (this.chessGameService.isInCheck(newState.board, currentColor, gameState.moveHistory.length + depth)) {
          continue;
        }

        const evaluation = this.alphaBetaSearch(newState, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);

        if (beta <= alpha) {
          // 記錄殺手移動和歷史表
          this.recordKillerMove(depth, move);
          this.updateHistoryTable(move, depth);
          break; // Alpha cutoff
        }
      }

      return minEval;
    }
  }

  // ==========================================
  // XQWLight 評估函數
  // ==========================================

  private evaluatePosition(gameState: GameState): number {
    let score = 0;

    // 優先檢查：王是否處於被直接攻擊的危險中
    const moveCount = gameState.moveHistory.length;

    // 檢查黑王是否會被吃掉
    const blackKingInDanger = this.chessGameService.isInCheck(gameState.board, PlayerColor.BLACK, moveCount);
    if (blackKingInDanger) {
      // 黑方王被攻擊，對黑方極其不利
      score -= XQWLIGHT_CONFIG.MATE_VALUE * 2;
    }

    // 檢查紅王是否會被吃掉
    const redKingInDanger = this.chessGameService.isInCheck(gameState.board, PlayerColor.RED, moveCount);
    if (redKingInDanger) {
      // 紅方王被攻擊，對黑方極其有利
      score += XQWLIGHT_CONFIG.MATE_VALUE * 2;
    }

    // 1. XQWLight 原版棋子價值和位置評估
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = gameState.board[y][x];
        if (!piece) continue;

        // 使用 XQWLight 原版評分表
        let pieceScore = getPieceValue(piece.type, x, y, piece.color);

        // XQWLight 特殊評估
        if (piece.type === PieceType.KING) {
          pieceScore += evaluateKingSafety(piece.position, gameState.board, piece.color);
        } else if (piece.type === PieceType.SOLDIER) {
          pieceScore += evaluatePawnAdvancement(piece.position, piece.color);
        }

        // 機動性評估 (XQWLight 風格)
        const moveCount = this.chessGameService.getPossibleMoves(piece, gameState.board).length;
        pieceScore += evaluateMobility(piece.type, moveCount);

        if (piece.color === PlayerColor.BLACK) {
          score += pieceScore;
        } else {
          score -= pieceScore;
        }
      }
    }

    // 2. 全局評估
    const blackMoves = this.generateAllMoves(gameState, PlayerColor.BLACK).length;
    const redMoves = this.generateAllMoves(gameState, PlayerColor.RED).length;
    score += (blackMoves - redMoves) * XQWLIGHT_CONFIG.MOBILITY_FACTOR;

    // 3. 將軍獎勵/懲罰 - 使用正確的移動計數
    const currentMoveCount = gameState.moveHistory.length;
    if (this.chessGameService.isInCheck(gameState.board, PlayerColor.BLACK, currentMoveCount)) {
      score -= XQWLIGHT_CONFIG.CHECK_BONUS;
    }
    if (this.chessGameService.isInCheck(gameState.board, PlayerColor.RED, currentMoveCount)) {
      score += XQWLIGHT_CONFIG.CHECK_BONUS;
    }

    return score;
  }

  // ==========================================
  // XQWLight 移動排序 (關鍵優化)
  // ==========================================

  private orderMoves(
    gameState: GameState,
    moves: { from: Position; to: Position }[],
    depth: number
  ): { from: Position; to: Position }[] {
    return moves.sort((a, b) => {
      let scoreA = 0,
        scoreB = 0;

      // 1. 吃子移動優先 (MVV-LVA)
      const targetA = gameState.board[a.to.y][a.to.x];
      const targetB = gameState.board[b.to.y][b.to.x];
      const attackerA = gameState.board[a.from.y][a.from.x];
      const attackerB = gameState.board[b.from.y][b.from.x];

      if (targetA && attackerA) {
        scoreA +=
          PIECE_VALUES[targetA.type] -
          PIECE_VALUES[attackerA.type] +
          MOVE_ORDER_WEIGHTS.CAPTURE_BONUS;
      }
      if (targetB && attackerB) {
        scoreB +=
          PIECE_VALUES[targetB.type] -
          PIECE_VALUES[attackerB.type] +
          MOVE_ORDER_WEIGHTS.CAPTURE_BONUS;
      }

      // 2. 殺手移動
      if (this.isKillerMove(depth, a)) scoreA += MOVE_ORDER_WEIGHTS.KILLER_MOVE_BONUS;
      if (this.isKillerMove(depth, b)) scoreB += MOVE_ORDER_WEIGHTS.KILLER_MOVE_BONUS;

      // 3. 歷史表分數
      scoreA += this.getHistoryScore(a);
      scoreB += this.getHistoryScore(b);

      // 4. 位置改善評估 (XQWLight 原版)
      if (attackerA) {
        const fromValueA = getPieceValue(
          attackerA.type,
          a.from.x,
          a.from.y,
          attackerA.color
        );
        const toValueA = getPieceValue(attackerA.type, a.to.x, a.to.y, attackerA.color);
        scoreA += (toValueA - fromValueA) * MOVE_ORDER_WEIGHTS.POSITION_BONUS_FACTOR;
      }
      if (attackerB) {
        const fromValueB = getPieceValue(
          attackerB.type,
          b.from.x,
          b.from.y,
          attackerB.color
        );
        const toValueB = getPieceValue(attackerB.type, b.to.x, b.to.y, attackerB.color);
        scoreB += (toValueB - fromValueB) * MOVE_ORDER_WEIGHTS.POSITION_BONUS_FACTOR;
      }

      return scoreB - scoreA;
    });
  }

  // ==========================================
  // 輔助函數
  // ==========================================

  private generateAllMoves(
    gameState: GameState,
    color: PlayerColor
  ): { from: Position; to: Position }[] {
    return this.getAllPossibleMoves(gameState, color, this.chessGameService);
  }

  private simulateMove(gameState: GameState, move: { from: Position; to: Position }): GameState {
    const newBoard = gameState.board.map((row) => [...row]);
    const movingPiece = newBoard[move.from.y][move.from.x];

    if (movingPiece) {
      newBoard[move.to.y][move.to.x] = {
        ...movingPiece,
        position: { x: move.to.x, y: move.to.y },
        hasMoved: true,
        isSelected: false,
      };
      newBoard[move.from.y][move.from.x] = null;
    }

    return { ...gameState, board: newBoard };
  }

  private getFallbackMove(gameState: GameState): { from: Position; to: Position } | null {
    const aiColor = PlayerColor.BLACK; // AI 總是黑方
    const moves = this.generateAllMoves(gameState, aiColor);
    if (moves.length === 0) return null;

    // 過濾會讓自己被將軍的移動
    const legalMoves = moves.filter((move) => {
      const newState = this.simulateMove(gameState, move);
      return !this.chessGameService.isInCheck(newState.board, aiColor, gameState.moveHistory.length + 1);
    });

    if (legalMoves.length === 0) return moves[0]; // 如果沒有合法移動，隨機選一個

    // 優先選擇吃子移動
    const captureMoves = legalMoves.filter((move) => gameState.board[move.to.y][move.to.x] !== null);

    return captureMoves.length > 0 ? captureMoves[0] : legalMoves[0];
  }

  private recordKillerMove(depth: number, move: { from: Position; to: Position }): void {
    if (!this.killerMoves.has(depth)) {
      this.killerMoves.set(depth, []);
    }

    const killers = this.killerMoves.get(depth)!;
    if (killers.length < 2) {
      killers.push(move);
    } else {
      killers[1] = killers[0];
      killers[0] = move;
    }
  }

  private isKillerMove(depth: number, move: { from: Position; to: Position }): boolean {
    const killers = this.killerMoves.get(depth);
    if (!killers) return false;

    return killers.some(
      (killer) =>
        killer.from.x === move.from.x &&
        killer.from.y === move.from.y &&
        killer.to.x === move.to.x &&
        killer.to.y === move.to.y
    );
  }

  private updateHistoryTable(move: { from: Position; to: Position }, depth: number): void {
    const key = `${move.from.x}${move.from.y}${move.to.x}${move.to.y}`;
    const currentScore = this.historyTable.get(key) || 0;
    this.historyTable.set(
      key,
      Math.min(currentScore + depth * depth, MOVE_ORDER_WEIGHTS.HISTORY_BONUS_MAX)
    );
  }

  private getHistoryScore(move: { from: Position; to: Position }): number {
    const key = `${move.from.x}${move.from.y}${move.to.x}${move.to.y}`;
    return this.historyTable.get(key) || 0;
  }
}
