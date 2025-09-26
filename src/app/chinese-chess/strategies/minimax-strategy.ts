import { Injectable, inject } from '@angular/core';
import { BaseAIStrategy, AIStrategyResult } from './base-ai-strategy';
import { PlayerColor, Position, GameState } from '../chess-piece.interface';
import { ChessGameService } from '../chess-game.service';
import { PIECE_VALUES, getPieceValue } from '../chess-values';

interface MoveEval {
  move: { from: Position; to: Position };
  score: number;
  depth?: number;
  nodes?: number;
  time?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MinimaxStrategy extends BaseAIStrategy {
  readonly name = 'Minimax算法 (XQWLight增強)';
  readonly priority = 3;

  private chessGameService = inject(ChessGameService);

  // 策略參數 (整合 XQWLight 的優化)
  private maxDepth = 4;
  private maxTime = 3000; // 最大思考時間 (毫秒)
  private startTime = 0;
  private nodeCount = 0;

  async isAvailable(): Promise<boolean> {
    return true; // 總是可用
  }

  async makeMove(gameState: GameState): Promise<AIStrategyResult | null> {
    console.log(`🧠 使用 Minimax 算法 (XQWLight增強，深度${this.maxDepth}，時間${this.maxTime}ms)...`);
    const startTime = Date.now();
    this.startTime = startTime;
    this.nodeCount = 0;

    try {
      const result = await this.alphaBetaSearch(
        gameState,
        this.maxDepth,
        -999999,
        999999,
        true // BLACK 是最大化玩家
      );
      
      const elapsed = Date.now() - startTime;

      if (result && result.move) {
        console.log(`✅ Minimax 分析完成: ${elapsed}ms, 搜索${this.nodeCount}個節點, 評分=${result.score}`);
        console.log(
          `🤖 選擇移動: (${result.move.from.x},${result.move.from.y}) -> (${result.move.to.x},${result.move.to.y})`
        );
        
        return {
          from: result.move.from,
          to: result.move.to,
          score: result.score,
          analysis: `Minimax (XQWLight增強) 深度${this.maxDepth}, 搜索${this.nodeCount}節點, ${elapsed}ms, 評分${result.score}`
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Minimax 策略執行失敗:', error);
      return null;
    }
  }

  getThinkingDescription(): string {
    return `🧠 Minimax 算法正在深度分析 (XQWLight增強，${this.maxDepth}層)...`;
  }

  // 設置難度 (整合 XQWLight 的難度設置邏輯)
  setDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
    switch (difficulty) {
      case 'easy':
        this.maxDepth = Math.max(2, Math.min(8, Math.floor(3 * 0.8) + 2)); // ~4
        this.maxTime = Math.max(1000, Math.min(8000, 3 * 800)); // 2400ms
        break;
      case 'medium':
        this.maxDepth = Math.max(2, Math.min(8, Math.floor(5 * 0.8) + 2)); // ~6
        this.maxTime = Math.max(1000, Math.min(8000, 5 * 800)); // 4000ms
        break;
      case 'hard':
        this.maxDepth = Math.max(2, Math.min(8, Math.floor(7 * 0.8) + 2)); // ~7
        this.maxTime = Math.max(1000, Math.min(8000, 7 * 800)); // 5600ms
        break;
    }
    console.log(`🧠 Minimax 引擎難度設置: ${difficulty} (深度=${this.maxDepth}, 時間=${this.maxTime}ms)`);
  }

  // Alpha-Beta 搜索算法 (整合 XQWLight 的優化實現)
  private async alphaBetaSearch(
    gameState: GameState,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizingPlayer: boolean
  ): Promise<MoveEval | null> {
    this.nodeCount++;

    // 時間限制檢查 (XQWLight 的時間控制)
    if (Date.now() - this.startTime > this.maxTime) {
      return null;
    }

    // 達到搜索深度，返回評估分數
    if (depth === 0) {
      const score = this.evaluatePosition(gameState);
      return { 
        move: { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } }, 
        score,
        depth: this.maxDepth - depth,
        nodes: this.nodeCount,
        time: Date.now() - this.startTime
      };
    }

    const currentColor = isMaximizingPlayer ? PlayerColor.BLACK : PlayerColor.RED;
    const moves = this.getAllPossibleMoves(gameState, currentColor, this.chessGameService);

    if (moves.length === 0) {
      // 無移動可走 - 可能是將死或和棋 (使用 XQWLight 的判斷邏輯)
      const inCheck = this.chessGameService.isInCheck(gameState.board, currentColor);
      const score = inCheck ? (isMaximizingPlayer ? -999999 : 999999) : 0;
      return { 
        move: { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } }, 
        score,
        depth: this.maxDepth - depth,
        nodes: this.nodeCount,
        time: Date.now() - this.startTime
      };
    }

    // 移動排序優化 - XQWLight 的重要優化
    const sortedMoves = this.orderMovesAdvanced(gameState, moves);

    let bestMove: { from: Position; to: Position } | null = null;

    if (isMaximizingPlayer) {
      let maxEval = -999999;

      for (const move of sortedMoves) {
        const newState = this.simulateMove(gameState, move.from, move.to);

        // 檢查移動是否會讓自己被將軍（剪枝）
        if (this.chessGameService.isInCheck(newState.board, currentColor)) {
          continue; // 跳過這個危險移動
        }

        const result = await this.alphaBetaSearch(newState, depth - 1, alpha, beta, false);

        if (result && result.score > maxEval) {
          maxEval = result.score;
          bestMove = move;
        }

        alpha = Math.max(alpha, maxEval);
        if (beta <= alpha) {
          break; // Beta cutoff (XQWLight 的剪枝)
        }
      }

      return bestMove ? { 
        move: bestMove, 
        score: maxEval,
        depth: this.maxDepth - depth,
        nodes: this.nodeCount,
        time: Date.now() - this.startTime
      } : null;

    } else {
      let minEval = 999999;

      for (const move of sortedMoves) {
        const newState = this.simulateMove(gameState, move.from, move.to);

        // 檢查移動是否會讓自己被將軍
        if (this.chessGameService.isInCheck(newState.board, currentColor)) {
          continue;
        }

        const result = await this.alphaBetaSearch(newState, depth - 1, alpha, beta, true);

        if (result && result.score < minEval) {
          minEval = result.score;
          bestMove = move;
        }

        beta = Math.min(beta, minEval);
        if (beta <= alpha) {
          break; // Alpha cutoff (XQWLight 的剪枝)
        }
      }

      return bestMove ? { 
        move: bestMove, 
        score: minEval,
        depth: this.maxDepth - depth,
        nodes: this.nodeCount,
        time: Date.now() - this.startTime
      } : null;
    }
  }

  // 高級移動排序 (整合 XQWLight 的排序算法)
  private orderMovesAdvanced(
    gameState: GameState,
    moves: { from: Position; to: Position }[]
  ): { from: Position; to: Position }[] {
    return moves.sort((a, b) => {
      let scoreA = 0, scoreB = 0;

      // 吃子移動優先 (使用 XQWLight 的評分方式)
      const targetA = gameState.board[a.to.y][a.to.x];
      const targetB = gameState.board[b.to.y][b.to.x];

      if (targetA) {
        scoreA += PIECE_VALUES[targetA.type] + 1000; // XQWLight 的吃子獎勵
      }
      if (targetB) {
        scoreB += PIECE_VALUES[targetB.type] + 1000;
      }

      // 將軍移動優先 (使用 XQWLight 的將軍獎勵)
      const testStateA = this.simulateMove(gameState, a.from, a.to);
      const testStateB = this.simulateMove(gameState, b.from, b.to);

      if (this.chessGameService.isInCheck(testStateA.board, PlayerColor.RED)) {
        scoreA += 500; // XQWLight 的將軍獎勵
      }
      if (this.chessGameService.isInCheck(testStateB.board, PlayerColor.RED)) {
        scoreB += 500;
      }

      // 添加一些隨機性 (XQWLight 的做法)
      scoreA += Math.floor(Math.random() * 20);
      scoreB += Math.floor(Math.random() * 20);

      return scoreB - scoreA;
    });
  }

  // 位置評估函數 (整合 XQWLight 的完整評估系統)
  private evaluatePosition(gameState: GameState): number {
    let score = 0;

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = gameState.board[y][x];
        if (!piece) continue;

        // 使用 XQWLight 風格的完整評估 (基本價值 + 位置價值)
        const pieceValue = getPieceValue(piece.type, x, y, piece.color);

        if (piece.color === PlayerColor.BLACK) {
          score += pieceValue;
        } else {
          score -= pieceValue;
        }
      }
    }

    // 機動性評估 (XQWLight 的機動性因子)
    const blackMoves = this.getAllPossibleMoves(gameState, PlayerColor.BLACK, this.chessGameService).length;
    const redMoves = this.getAllPossibleMoves(gameState, PlayerColor.RED, this.chessGameService).length;
    score += (blackMoves - redMoves) * 5;

    // 將軍懲罰/獎勵 (XQWLight 的將軍評估)
    if (this.chessGameService.isInCheck(gameState.board, PlayerColor.BLACK)) {
      score -= 200; // XQWLight 的將軍懲罰
    }
    if (this.chessGameService.isInCheck(gameState.board, PlayerColor.RED)) {
      score += 200; // XQWLight 的將軍獎勵
    }

    return score;
  }

  // 模擬移動（優化版本，減少不必要的複製）
  private simulateMove(gameState: GameState, from: Position, to: Position): GameState {
    // 只複製受影響的行和棋子
    const newBoard = gameState.board.map((row, y) => {
      if (y === from.y || y === to.y) {
        return row.map((piece, x) => {
          if ((x === from.x && y === from.y) || (x === to.x && y === to.y)) {
            if (x === from.x && y === from.y) {
              // 移動的起始位置變為空
              return null;
            } else if (x === to.x && y === to.y) {
              // 目標位置放置移動的棋子
              const movingPiece = gameState.board[from.y][from.x];
              return movingPiece
                ? {
                    ...movingPiece,
                    position: { x: to.x, y: to.y },
                    hasMoved: true,
                    isSelected: false,
                  }
                : null;
            }
          }
          return piece;
        });
      }
      return row; // 未受影響的行直接引用原陣列
    });

    return { ...gameState, board: newBoard };
  }
}