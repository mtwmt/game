import { Injectable } from '@angular/core';
import { ChessPiece, PieceType, PlayerColor, Position, GameState } from './chess-piece.interface';
import { ChessGameService } from './chess-game.service';

interface MoveEvaluation {
  from: Position;
  to: Position;
  score: number;
  capturedPiece?: ChessPiece;
}

@Injectable({
  providedIn: 'root',
})
export class ChessAIService {
  constructor(private chessGameService: ChessGameService) {}

  // AI思考深度
  private readonly MAX_DEPTH = 3;

  // 棋子價值表
  private readonly PIECE_VALUES = {
    [PieceType.KING]: 10000,
    [PieceType.ROOK]: 500,
    [PieceType.CANNON]: 450,
    [PieceType.HORSE]: 400,
    [PieceType.ELEPHANT]: 200,
    [PieceType.ADVISOR]: 200,
    [PieceType.SOLDIER]: 100,
  };

  makeAIMove(gameState: GameState): { from: Position; to: Position } | null {
    console.log('🤖 AI開始分析棋局...');

    const allMoves = this.getAllPossibleMoves(gameState, PlayerColor.BLACK);
    console.log(`🤖 找到 ${allMoves.length} 個可能移動`);

    // 如果沒有可能的移動，AI投降
    if (allMoves.length === 0) {
      console.log('🤖 AI無移動可走，準備投降');
      return null;
    }

    // 檢查是否被將軍，如果是則使用更快的算法
    const isInCheck = this.chessGameService.isInCheck(gameState.board, PlayerColor.BLACK);
    const searchDepth = isInCheck ? Math.min(2, this.MAX_DEPTH) : this.MAX_DEPTH;

    console.log(`🤖 AI${isInCheck ? '被將軍，' : ''}使用深度 ${searchDepth} 進行搜索`);

    const bestMove = this.findBestMoveWithTimeout(gameState, searchDepth, 3000); // 3秒超時

    if (bestMove) {
      console.log(
        `🤖 AI決定移動: (${bestMove.from.x},${bestMove.from.y}) -> (${bestMove.to.x},${bestMove.to.y}), 評分: ${bestMove.score}`
      );
      return {
        from: bestMove.from,
        to: bestMove.to,
      };
    }

    console.warn('🤖 AI無法找到最佳移動或超時，隨機選擇');
    // 如果找不到最佳移動或超時，隨機選擇一個
    const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];
    return {
      from: randomMove.from,
      to: randomMove.to,
    };
  }

  private findBestMoveWithTimeout(
    gameState: GameState,
    depth: number,
    timeoutMs: number
  ): MoveEvaluation | null {
    const startTime = Date.now();
    let bestMove: MoveEvaluation | null = null;

    try {
      // 使用Promise.race來實現超時
      return this.findBestMoveInternal(gameState, depth, startTime, timeoutMs);
    } catch (error) {
      console.warn('🤖 AI搜索超時或出錯:', error);
      return bestMove;
    }
  }

  private findBestMoveInternal(
    gameState: GameState,
    depth: number,
    startTime: number,
    timeoutMs: number
  ): MoveEvaluation | null {
    const moves = this.getAllPossibleMoves(gameState, gameState.currentPlayer);

    if (moves.length === 0) return null;

    let bestMove: MoveEvaluation | null = null;
    let bestScore = gameState.currentPlayer === PlayerColor.BLACK ? -Infinity : Infinity;

    for (const move of moves) {
      // 檢查超時
      if (Date.now() - startTime > timeoutMs) {
        console.log('🤖 AI搜索超時，返回當前最佳移動');
        break;
      }

      // 模擬移動
      const newGameState = this.simulateMove(gameState, move);

      // 使用Minimax算法評估，也傳入超時參數
      const score = this.minimaxWithTimeout(
        newGameState,
        depth - 1,
        -Infinity,
        Infinity,
        gameState.currentPlayer === PlayerColor.RED,
        startTime,
        timeoutMs
      );

      move.score = score;

      if (gameState.currentPlayer === PlayerColor.BLACK) {
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      } else {
        if (score < bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
    }

    return bestMove;
  }

  private minimaxWithTimeout(
    gameState: GameState,
    depth: number,
    alpha: number,
    beta: number,
    maximizingPlayer: boolean,
    startTime: number,
    timeoutMs: number
  ): number {
    // 檢查超時
    if (Date.now() - startTime > timeoutMs) {
      return this.evaluateBoard(gameState);
    }

    if (depth === 0 || gameState.gameOver) {
      return this.evaluateBoard(gameState);
    }

    const moves = this.getAllPossibleMoves(gameState, gameState.currentPlayer);

    if (maximizingPlayer) {
      let maxEval = -Infinity;
      for (const move of moves) {
        // 每次遞歸前都檢查超時
        if (Date.now() - startTime > timeoutMs) {
          break;
        }

        const newGameState = this.simulateMove(gameState, move);
        const evaluation = this.minimaxWithTimeout(
          newGameState,
          depth - 1,
          alpha,
          beta,
          false,
          startTime,
          timeoutMs
        );
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break; // Alpha-beta剪枝
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        // 每次遞歸前都檢查超時
        if (Date.now() - startTime > timeoutMs) {
          break;
        }

        const newGameState = this.simulateMove(gameState, move);
        const evaluation = this.minimaxWithTimeout(
          newGameState,
          depth - 1,
          alpha,
          beta,
          true,
          startTime,
          timeoutMs
        );
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break; // Alpha-beta剪枝
      }
      return minEval;
    }
  }

  private getAllPossibleMoves(gameState: GameState, color: PlayerColor): MoveEvaluation[] {
    const moves: MoveEvaluation[] = [];

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = gameState.board[y][x];
        if (piece && piece.color === color) {
          const possibleMoves = this.chessGameService.getPossibleMoves(piece, gameState.board);

          for (const to of possibleMoves) {
            const capturedPiece = gameState.board[to.y][to.x];
            moves.push({
              from: piece.position,
              to,
              score: 0,
              capturedPiece: capturedPiece || undefined,
            });
          }
        }
      }
    }

    return moves;
  }

  private simulateMove(gameState: GameState, move: MoveEvaluation): GameState {
    // 深拷貝遊戲狀態
    const newBoard = gameState.board.map((row) =>
      row.map((piece) => (piece ? { ...piece, position: { ...piece.position } } : null))
    );

    // 執行移動
    const piece = newBoard[move.from.y][move.from.x];
    if (piece) {
      newBoard[move.to.y][move.to.x] = piece;
      newBoard[move.from.y][move.from.x] = null;
      piece.position = { ...move.to };
    }

    return {
      ...gameState,
      board: newBoard,
      currentPlayer:
        gameState.currentPlayer === PlayerColor.RED ? PlayerColor.BLACK : PlayerColor.RED,
    };
  }

  private evaluateBoard(gameState: GameState): number {
    let score = 0;

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = gameState.board[y][x];
        if (piece) {
          let pieceScore = this.PIECE_VALUES[piece.type];

          // 位置獎勵
          pieceScore += this.getPositionBonus(piece);

          // 威脅評估
          pieceScore += this.getThreatScore(x, y, piece, gameState.board);

          // 根據顏色調整分數 (黑方AI，所以黑方正分，紅方負分)
          if (piece.color === PlayerColor.BLACK) {
            score += pieceScore;
          } else {
            score -= pieceScore;
          }
        }
      }
    }

    // 中央控制評分
    score += this.getCenterControlScore(gameState.board);

    // 將軍檢測評分
    score += this.getCheckScore(gameState.board);

    return score;
  }

  private getPositionBonus(piece: ChessPiece): number {
    const { x, y } = piece.position;
    let bonus = 0;

    // 中央控制獎勵
    const centerDistance = Math.abs(y - 4.5) + Math.abs(x - 4);
    bonus += (9 - centerDistance) * 2;

    // 特殊棋子位置獎勵
    switch (piece.type) {
      case PieceType.HORSE:
        // 馬在中央更有威力
        if (y >= 2 && y <= 7 && x >= 1 && x <= 7) {
          bonus += 30;
        }
        break;
      case PieceType.CANNON:
        // 炮在後排和中央列更好
        if (x === 4 || y === (piece.color === PlayerColor.RED ? 7 : 2)) {
          bonus += 20;
        }
        break;
      case PieceType.SOLDIER:
        // 兵過河獎勵
        const hasPassedRiver =
          (piece.color === PlayerColor.RED && y < 5) ||
          (piece.color === PlayerColor.BLACK && y > 4);
        if (hasPassedRiver) {
          bonus += 50;
          // 兵在敵方陣地更深入更好
          const depth = piece.color === PlayerColor.RED ? 4 - y : y - 5;
          bonus += depth * 10;
        }
        break;
    }

    return bonus;
  }

  private getThreatScore(
    x: number,
    y: number,
    piece: ChessPiece,
    board: (ChessPiece | null)[][]
  ): number {
    let score = 0;
    const enemyColor = piece.color === PlayerColor.RED ? PlayerColor.BLACK : PlayerColor.RED;

    // 檢查是否受到敵方攻擊
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const enemyPiece = board[r][c];
        if (enemyPiece && enemyPiece.color === enemyColor) {
          const enemyMoves = this.chessGameService.getPossibleMoves(enemyPiece, board);
          if (enemyMoves.some((move) => move.x === x && move.y === y)) {
            // 受到攻擊，根據棋子價值減分
            score -= this.PIECE_VALUES[piece.type] * 0.5;
            break;
          }
        }
      }
    }

    return score;
  }

  private getCenterControlScore(board: (ChessPiece | null)[][]): number {
    let score = 0;
    const centerCells = [
      { x: 3, y: 4 },
      { x: 4, y: 4 },
      { x: 5, y: 4 },
      { x: 3, y: 5 },
      { x: 4, y: 5 },
      { x: 5, y: 5 },
    ];

    for (const { x, y } of centerCells) {
      const piece = board[y][x];
      if (piece) {
        if (piece.color === PlayerColor.BLACK) {
          score += 15;
        } else {
          score -= 15;
        }
      }
    }

    return score;
  }

  private getCheckScore(board: (ChessPiece | null)[][]): number {
    let score = 0;

    // 檢查AI是否在將軍對手
    if (this.chessGameService.isInCheck(board, PlayerColor.RED)) {
      score += 100; // 將軍獎勵
    }

    // 檢查AI的王是否被將軍
    if (this.chessGameService.isInCheck(board, PlayerColor.BLACK)) {
      score -= 100; // 被將軍懲罰
    }

    return score;
  }

  // 獲取AI思考的描述文字
  getThinkingDescription(gameState: GameState): string {
    const threats = this.analyzeThreats(gameState);
    const opportunities = this.analyzeOpportunities(gameState);

    const descriptions = [
      '正在分析棋局形勢...',
      '計算最佳移動路線...',
      '評估攻防平衡...',
      '尋找戰術機會...',
    ];

    if (threats.length > 0) {
      descriptions.push('發現威脅，正在制定防守策略...');
    }

    if (opportunities.length > 0) {
      descriptions.push('發現攻擊機會，正在計算...');
    }

    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  private analyzeThreats(gameState: GameState): Position[] {
    // 簡化的威脅分析
    const threats: Position[] = [];
    const aiColor = PlayerColor.BLACK;
    const opponentColor = PlayerColor.RED;

    // 檢查AI的將是否被威脅
    if (this.chessGameService.isInCheck(gameState.board, aiColor)) {
      // 找到將的位置
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 9; x++) {
          const piece = gameState.board[y][x];
          if (piece && piece.type === PieceType.KING && piece.color === aiColor) {
            threats.push({ x, y });
            break;
          }
        }
      }
    }

    return threats;
  }

  private analyzeOpportunities(gameState: GameState): Position[] {
    // 簡化的機會分析
    const opportunities: Position[] = [];
    const aiColor = PlayerColor.BLACK;

    // 檢查是否能將軍對手
    if (this.chessGameService.isInCheck(gameState.board, PlayerColor.RED)) {
      opportunities.push({ x: 4, y: 9 }); // 假設對手將的位置
    }

    return opportunities;
  }
}
