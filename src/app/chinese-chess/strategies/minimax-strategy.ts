import { Injectable, inject } from '@angular/core';
import { BaseAIStrategy, AIStrategyResult } from './base-ai-strategy';
import { PlayerColor, Position, GameState } from '../chess-piece.interface';
import { ChessGameService } from '../chess-game.service';
import { PIECE_VALUES, getPieceValue } from '../chess-values';

// 搜索算法常數
const SEARCH_CONSTANTS = {
  INFINITY: 999999 as number,
  NEGATIVE_INFINITY: -999999 as number,
  MIN_DEPTH: 2,
  MAX_DEPTH: 8,
  MIN_TIME: 1000,
  MAX_TIME: 8000,
  DEPTH_MULTIPLIER: 0.8,
  TIME_MULTIPLIER: 800,
  CAPTURE_BONUS: 1000,
  CHECK_BONUS: 500,
  CHECK_PENALTY: 200,
  MOBILITY_FACTOR: 5,
  RANDOM_FACTOR: 20
};

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
        SEARCH_CONSTANTS.NEGATIVE_INFINITY,
        SEARCH_CONSTANTS.INFINITY,
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

  // 設置難度 (使用常數優化的難度設置邏輯)
  setDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
    const difficultyParams = this.getDifficultyParameters(difficulty);
    this.maxDepth = Math.max(
      SEARCH_CONSTANTS.MIN_DEPTH, 
      Math.min(SEARCH_CONSTANTS.MAX_DEPTH, Math.floor(difficultyParams.level * SEARCH_CONSTANTS.DEPTH_MULTIPLIER) + 2)
    );
    this.maxTime = Math.max(
      SEARCH_CONSTANTS.MIN_TIME, 
      Math.min(SEARCH_CONSTANTS.MAX_TIME, difficultyParams.level * SEARCH_CONSTANTS.TIME_MULTIPLIER)
    );
    console.log(`🧠 Minimax 引擎難度設置: ${difficulty} (深度=${this.maxDepth}, 時間=${this.maxTime}ms)`);
  }

  private getDifficultyParameters(difficulty: 'easy' | 'medium' | 'hard'): { level: number } {
    switch (difficulty) {
      case 'easy': return { level: 3 };
      case 'medium': return { level: 5 };
      case 'hard': return { level: 7 };
    }
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
      // 無移動可走 - 可能是將死或和棋
      const inCheck = this.chessGameService.isInCheck(gameState.board, currentColor);
      const score = inCheck ? (isMaximizingPlayer ? SEARCH_CONSTANTS.NEGATIVE_INFINITY : SEARCH_CONSTANTS.INFINITY) : 0;
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
      let maxEval = SEARCH_CONSTANTS.NEGATIVE_INFINITY;

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
          break; // Beta cutoff
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
      let minEval = SEARCH_CONSTANTS.INFINITY;

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
          break; // Alpha cutoff
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
        scoreA += PIECE_VALUES[targetA.type] + SEARCH_CONSTANTS.CAPTURE_BONUS;
      }
      if (targetB) {
        scoreB += PIECE_VALUES[targetB.type] + SEARCH_CONSTANTS.CAPTURE_BONUS;
      }

      // 將軍移動優先
      const testStateA = this.simulateMove(gameState, a.from, a.to);
      const testStateB = this.simulateMove(gameState, b.from, b.to);

      if (this.chessGameService.isInCheck(testStateA.board, PlayerColor.RED)) {
        scoreA += SEARCH_CONSTANTS.CHECK_BONUS;
      }
      if (this.chessGameService.isInCheck(testStateB.board, PlayerColor.RED)) {
        scoreB += SEARCH_CONSTANTS.CHECK_BONUS;
      }

      // 添加一些隨機性
      scoreA += Math.floor(Math.random() * SEARCH_CONSTANTS.RANDOM_FACTOR);
      scoreB += Math.floor(Math.random() * SEARCH_CONSTANTS.RANDOM_FACTOR);

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

    // 機動性評估
    const blackMoves = this.getAllPossibleMoves(gameState, PlayerColor.BLACK, this.chessGameService).length;
    const redMoves = this.getAllPossibleMoves(gameState, PlayerColor.RED, this.chessGameService).length;
    score += (blackMoves - redMoves) * SEARCH_CONSTANTS.MOBILITY_FACTOR;

    // 將軍懲罰/獎勵
    if (this.chessGameService.isInCheck(gameState.board, PlayerColor.BLACK)) {
      score -= SEARCH_CONSTANTS.CHECK_PENALTY;
    }
    if (this.chessGameService.isInCheck(gameState.board, PlayerColor.RED)) {
      score += SEARCH_CONSTANTS.CHECK_PENALTY;
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