import { Injectable, inject } from '@angular/core';
import { BaseAIStrategy, AIStrategyResult } from './base-ai-strategy';
import { PlayerColor, Position, GameState } from '../chess-piece.interface';
import { ChessGameService } from '../chess-game.service';
import { PIECE_VALUES, getPositionBonus } from '../chess-values';

interface MoveEval {
  move: { from: Position; to: Position };
  score: number;
}

@Injectable({
  providedIn: 'root'
})
export class MinimaxStrategy extends BaseAIStrategy {
  readonly name = 'Minimax算法';
  readonly priority = 3;

  private chessGameService = inject(ChessGameService);

  // 策略參數
  private maxDepth = 4;
  private searchTime = 3000;
  private startTime = 0;
  private nodes = 0;

  async isAvailable(): Promise<boolean> {
    return true; // 總是可用
  }

  async makeMove(gameState: GameState): Promise<AIStrategyResult | null> {
    console.log(`🧠 使用 Minimax 算法 (深度${this.maxDepth}層)...`);
    const startTime = Date.now();
    this.startTime = startTime;
    this.nodes = 0;

    try {
      const result = this.minimax(gameState, this.maxDepth, -Infinity, Infinity, true);
      const elapsed = Date.now() - startTime;

      console.log(`🎯 Minimax 決策完成: ${elapsed}ms, 搜索${this.nodes}個節點`);

      if (result && result.move) {
        console.log(
          `🤖 選擇移動: (${result.move.from.x},${result.move.from.y}) -> (${result.move.to.x},${result.move.to.y}), 評分: ${result.score}`
        );
        return {
          from: result.move.from,
          to: result.move.to,
          score: result.score,
          analysis: `Minimax 深度 ${this.maxDepth}, 搜索 ${this.nodes} 節點, 評分 ${result.score}`
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Minimax 策略執行失敗:', error);
      return null;
    }
  }

  getThinkingDescription(): string {
    return `🧠 Minimax 算法正在深度分析 (${this.maxDepth}層)...`;
  }

  // 設置難度
  setDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
    switch (difficulty) {
      case 'easy':
        this.maxDepth = 2;
        this.searchTime = 1000;
        break;
      case 'medium':
        this.maxDepth = 4;
        this.searchTime = 3000;
        break;
      case 'hard':
        this.maxDepth = 6;
        this.searchTime = 5000;
        break;
    }
  }

  // Minimax with Alpha-Beta Pruning
  private minimax(
    gameState: GameState,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean
  ): MoveEval | null {
    this.nodes++;

    // 時間限制檢查
    if (Date.now() - this.startTime > this.searchTime) {
      return null;
    }

    // 終止條件: 深度為0或遊戲結束
    if (depth === 0) {
      return {
        move: { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } },
        score: this.evaluatePosition(gameState),
      };
    }

    const currentColor = isMaximizing ? PlayerColor.BLACK : PlayerColor.RED;
    const moves = this.getAllPossibleMoves(gameState, currentColor, this.chessGameService);

    if (moves.length === 0) {
      // 無移動可走，檢查是否將死
      const inCheck = this.chessGameService.isInCheck(gameState.board, currentColor);
      if (inCheck) {
        // 將死
        return {
          move: { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } },
          score: isMaximizing ? -10000 : 10000,
        };
      } else {
        // 和棋
        return { move: { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } }, score: 0 };
      }
    }

    // 移動排序優化 - 優先考慮吃子和將軍
    const sortedMoves = this.orderMoves(gameState, moves);

    let bestMove: { from: Position; to: Position } | null = null;

    if (isMaximizing) {
      let maxEval = -Infinity;

      for (const move of sortedMoves) {
        const newState = this.simulateMove(gameState, move.from, move.to);

        // 檢查移動是否會讓自己被將軍（剪枝）
        if (this.chessGameService.isInCheck(newState.board, PlayerColor.BLACK)) {
          continue; // 跳過這個危險移動
        }

        const result = this.minimax(newState, depth - 1, alpha, beta, false);

        if (result && result.score > maxEval) {
          maxEval = result.score;
          bestMove = move;
        }

        alpha = Math.max(alpha, maxEval);
        if (beta <= alpha) {
          break; // Alpha-Beta剪枝
        }
      }

      return bestMove ? { move: bestMove, score: maxEval } : null;
    } else {
      let minEval = Infinity;

      for (const move of sortedMoves) {
        const newState = this.simulateMove(gameState, move.from, move.to);

        // 檢查移動是否會讓自己被將軍
        if (this.chessGameService.isInCheck(newState.board, PlayerColor.RED)) {
          continue;
        }

        const result = this.minimax(newState, depth - 1, alpha, beta, true);

        if (result && result.score < minEval) {
          minEval = result.score;
          bestMove = move;
        }

        beta = Math.min(beta, minEval);
        if (beta <= alpha) {
          break; // Alpha-Beta剪枝
        }
      }

      return bestMove ? { move: bestMove, score: minEval } : null;
    }
  }

  // 移動排序 - 優先搜索可能更好的移動
  private orderMoves(
    gameState: GameState,
    moves: { from: Position; to: Position }[]
  ): { from: Position; to: Position }[] {
    return moves.sort((a, b) => {
      let scoreA = 0,
        scoreB = 0;

      // 吃子移動優先
      const targetA = gameState.board[a.to.y][a.to.x];
      const targetB = gameState.board[b.to.y][b.to.x];

      if (targetA) scoreA += PIECE_VALUES[targetA.type];
      if (targetB) scoreB += PIECE_VALUES[targetB.type];

      // 將軍移動優先
      const testStateA = this.simulateMove(gameState, a.from, a.to);
      const testStateB = this.simulateMove(gameState, b.from, b.to);

      if (this.chessGameService.isInCheck(testStateA.board, PlayerColor.RED)) scoreA += 100;
      if (this.chessGameService.isInCheck(testStateB.board, PlayerColor.RED)) scoreB += 100;

      return scoreB - scoreA;
    });
  }

  // 位置評估函數
  private evaluatePosition(gameState: GameState): number {
    let score = 0;

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = gameState.board[y][x];
        if (!piece) continue;

        let pieceValue = PIECE_VALUES[piece.type];

        // 位置獎勵
        pieceValue += getPositionBonus(piece.type, x, y, piece.color);

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
    score += (blackMoves - redMoves) * 5;

    // 將軍懲罰/獎勵
    if (this.chessGameService.isInCheck(gameState.board, PlayerColor.BLACK)) {
      score -= 100;
    }
    if (this.chessGameService.isInCheck(gameState.board, PlayerColor.RED)) {
      score += 100;
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