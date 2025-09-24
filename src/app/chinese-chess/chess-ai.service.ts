import { Injectable } from '@angular/core';
import { ChessPiece, PieceType, PlayerColor, Position, GameState } from './chess-piece.interface';
import { ChessGameService } from './chess-game.service';

export enum AIDifficulty {
  EASY = 2,      // 看前2步
  MEDIUM = 3,    // 看前3步
  HARD = 4       // 看前4步
}

interface MoveEvaluation {
  from: Position;
  to: Position;
  score: number;
}

@Injectable({
  providedIn: 'root',
})
export class ChessAIService {
  // 重新寫入的AI服務
  private difficulty: AIDifficulty = AIDifficulty.HARD;

  // 棋子基本價值
  private readonly PIECE_VALUES = {
    [PieceType.KING]: 10000,     // 將帥
    [PieceType.ROOK]: 500,       // 車
    [PieceType.CANNON]: 450,     // 炮/砲
    [PieceType.HORSE]: 400,      // 馬
    [PieceType.ELEPHANT]: 200,   // 相/象
    [PieceType.ADVISOR]: 200,    // 士/仕
    [PieceType.SOLDIER]: 100,    // 兵/卒
  };

  constructor(private chessGameService: ChessGameService) {
    console.log(`🤖 AI初始化 - 預設難度: ${this.getDifficultyName()} (深度${this.difficulty}步)`);
  }

  getDifficulty(): AIDifficulty {
    return this.difficulty;
  }

  setDifficulty(difficulty: AIDifficulty): void {
    this.difficulty = difficulty;
    console.log(`🤖 AI難度設置為: ${this.getDifficultyName()} (深度: ${difficulty}步)`);
  }

  private getDifficultyName(): string {
    switch (this.difficulty) {
      case AIDifficulty.EASY: return '簡單';
      case AIDifficulty.MEDIUM: return '中等';
      case AIDifficulty.HARD: return '困難';
      default: return '未知';
    }
  }

  makeAIMove(gameState: GameState): { from: Position; to: Position } | null {
    console.log(`🤖 AI開始思考 (${this.getDifficultyName()}難度, 深度${this.difficulty}步)...`);

    const allMoves = this.getAllPossibleMoves(gameState, PlayerColor.BLACK);

    if (allMoves.length === 0) {
      console.log('🤖 AI無可用移動，投降');
      return null;
    }

    console.log(`🔍 找到 ${allMoves.length} 個可能移動`);

    // 使用Minimax + Alpha-Beta剪枝找最佳移動
    const bestMove = this.findBestMove(gameState, this.difficulty);

    if (bestMove) {
      console.log(`🎯 AI選擇移動: (${bestMove.from.x},${bestMove.from.y}) → (${bestMove.to.x},${bestMove.to.y}), 評分: ${bestMove.score}`);
      return { from: bestMove.from, to: bestMove.to };
    }

    // 後備方案：隨機選擇
    console.log('⚠️ Minimax未找到最佳移動，隨機選擇');
    const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];
    return { from: randomMove.from, to: randomMove.to };
  }

  private findBestMove(gameState: GameState, depth: number): MoveEvaluation | null {
    const allMoves = this.getAllPossibleMoves(gameState, PlayerColor.BLACK);

    if (allMoves.length === 0) return null;

    let bestMove: MoveEvaluation | null = null;
    let bestScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    console.log(`🌲 開始Minimax搜索 (深度: ${depth})`);

    for (const move of allMoves) {
      const newGameState = this.simulateMove(gameState, move);

      // Min層 (對手回合)
      const score = this.minimax(newGameState, depth - 1, alpha, beta, false);

      move.score = score;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }

      alpha = Math.max(alpha, score);
      if (beta <= alpha) {
        console.log('⚡ Alpha-Beta剪枝觸發');
        break;
      }
    }

    console.log(`📊 搜索完成，最佳分數: ${bestScore}`);
    return bestMove;
  }

  private minimax(
    gameState: GameState,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean
  ): number {
    // 達到深度限制或遊戲結束
    if (depth === 0 || gameState.gameOver) {
      return this.evaluatePosition(gameState);
    }

    const currentPlayer = isMaximizing ? PlayerColor.BLACK : PlayerColor.RED;
    const allMoves = this.getAllPossibleMoves(gameState, currentPlayer);

    if (allMoves.length === 0) {
      // 無移動可走 = 被將死或困斃
      return isMaximizing ? -9999 : 9999;
    }

    if (isMaximizing) {
      // AI回合 (Max層)
      let maxEval = -Infinity;
      for (const move of allMoves) {
        const newGameState = this.simulateMove(gameState, move);
        const evaluation = this.minimax(newGameState, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break; // Alpha-Beta剪枝
      }
      return maxEval;
    } else {
      // 玩家回合 (Min層)
      let minEval = Infinity;
      for (const move of allMoves) {
        const newGameState = this.simulateMove(gameState, move);
        const evaluation = this.minimax(newGameState, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break; // Alpha-Beta剪枝
      }
      return minEval;
    }
  }

  private evaluatePosition(gameState: GameState): number {
    let score = 0;

    // 計算雙方棋子總價值
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = gameState.board[y][x];
        if (piece) {
          let pieceValue = this.PIECE_VALUES[piece.type];

          // 簡單的位置獎勵
          pieceValue += this.getPositionBonus(piece);

          if (piece.color === PlayerColor.BLACK) {
            score += pieceValue; // AI得分
          } else {
            score -= pieceValue; // 玩家得分
          }
        }
      }
    }

    // 將軍狀態評估
    if (this.chessGameService.isInCheck(gameState.board, PlayerColor.RED)) {
      score += 300; // AI將軍玩家
    }
    if (this.chessGameService.isInCheck(gameState.board, PlayerColor.BLACK)) {
      score -= 300; // AI被將軍
    }

    return score;
  }

  private getPositionBonus(piece: ChessPiece): number {
    const { x, y } = piece.position;
    let bonus = 0;

    // 中央控制獎勵
    const centerDistance = Math.abs(x - 4) + Math.abs(y - 4.5);
    bonus += Math.max(0, (6 - centerDistance) * 5);

    // 兵過河獎勵
    if (piece.type === PieceType.SOLDIER) {
      const hasPassedRiver = (piece.color === PlayerColor.RED && y < 5) ||
                            (piece.color === PlayerColor.BLACK && y > 4);
      if (hasPassedRiver) {
        bonus += 30;
        // 越深入敵陣獎勵越多
        const depth = piece.color === PlayerColor.BLACK ? y - 5 : 4 - y;
        bonus += depth * 15;
      }
    }

    return bonus;
  }

  private getAllPossibleMoves(gameState: GameState, color: PlayerColor): MoveEvaluation[] {
    const moves: MoveEvaluation[] = [];

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = gameState.board[y][x];
        if (piece && piece.color === color) {
          const possibleMoves = this.chessGameService.getPossibleMoves(piece, gameState.board);

          for (const to of possibleMoves) {
            // 檢查是否會導致自己被將軍
            if (!this.wouldCauseSelfCheck(gameState, piece.position, to)) {
              moves.push({
                from: piece.position,
                to,
                score: 0
              });
            }
          }
        }
      }
    }

    return moves;
  }

  private wouldCauseSelfCheck(gameState: GameState, from: Position, to: Position): boolean {
    const testBoard = this.copyBoard(gameState.board);
    const piece = testBoard[from.y][from.x];

    if (!piece) return true;

    // 執行移動
    testBoard[to.y][to.x] = piece;
    testBoard[from.y][from.x] = null;
    piece.position = { x: to.x, y: to.y };

    // 檢查是否被將軍
    return this.chessGameService.isInCheck(testBoard, piece.color);
  }

  private simulateMove(gameState: GameState, move: MoveEvaluation): GameState {
    const newBoard = this.copyBoard(gameState.board);
    const piece = newBoard[move.from.y][move.from.x];

    if (piece) {
      newBoard[move.to.y][move.to.x] = piece;
      newBoard[move.from.y][move.from.x] = null;
      piece.position = { x: move.to.x, y: move.to.y };
    }

    return {
      ...gameState,
      board: newBoard,
      currentPlayer: gameState.currentPlayer === PlayerColor.RED ? PlayerColor.BLACK : PlayerColor.RED
    };
  }

  private copyBoard(board: (ChessPiece | null)[][]): (ChessPiece | null)[][] {
    return board.map(row =>
      row.map(piece => piece ? { ...piece, position: { ...piece.position } } : null)
    );
  }

  // 獲取思考描述 (簡化版)
  getThinkingDescription(gameState: GameState): string {
    const descriptions = [
      `🔍 分析局面 (${this.getDifficultyName()}模式)`,
      `🌲 建構遊戲樹 (深度${this.difficulty}步)`,
      '⚡ Alpha-Beta剪枝搜索中...',
      '📊 評估位置分數',
      '🎯 計算最佳移動'
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }
}