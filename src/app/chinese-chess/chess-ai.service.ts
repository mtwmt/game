import { inject, Injectable } from '@angular/core';
import { ChessPiece, PieceType, PlayerColor, Position, GameState } from './chess-piece.interface';
import { ChessGameService } from './chess-game.service';
import { PIECE_VALUES, getPieceValue, getPositionBonus } from './chess-values';
import {
  STANDARD_RESPONSES,
  findBestOpeningResponse,
  findMoveFromNotation,
  getPositionEvaluation,
} from './chess-openings';

interface MoveEvaluation {
  from: Position;
  to: Position;
  score: number;
  depth: number;
  capturedPiece?: ChessPiece;
}

interface TranspositionEntry {
  score: number;
  depth: number;
  flag: 'exact' | 'lower' | 'upper';
  bestMove?: { from: Position; to: Position };
}

@Injectable({
  providedIn: 'root',
})
export class ChessAIService {
  private chessGameService = inject(ChessGameService);
  private transpositionTable = new Map<string, TranspositionEntry>();
  private maxSearchTime = 3000; // 3秒思考時間
  private searchStartTime = 0;
  private nodesSearched = 0;
  private maxDepth = 4; // 預設搜尋深度

  // 改用從chess-openings.ts引入的開局庫
  private readonly OPENING_RESPONSES = STANDARD_RESPONSES;
  makeAIMove(gameState: GameState): { from: Position; to: Position } | null {
    console.log('🤖 AI開始思考...');
    this.searchStartTime = Date.now();
    this.nodesSearched = 0;

    try {
      // 檢查開局庫 - 擴展到前15步
      if (gameState.moveHistory.length > 0 && gameState.moveHistory.length <= 15) {
        const openingMove = this.getOpeningMove(gameState);
        if (openingMove) {
          console.log('🤖 使用開局回應:', openingMove);
          return openingMove;
        }
      }

      // 使用迭代加深搜尋
      let bestMove: { from: Position; to: Position } | null = null;

      for (let depth = 1; depth <= this.maxDepth; depth++) {
        if (Date.now() - this.searchStartTime > this.maxSearchTime) break;

        const result = this.minimax(gameState, depth, -Infinity, Infinity, true);
        if (result.bestMove) {
          bestMove = result.bestMove;
          console.log(`🤖 深度 ${depth}: 分數 ${result.score}, 移動 ${JSON.stringify(bestMove)}`);
        }
      }

      console.log(
        `🤖 搜尋完成: ${this.nodesSearched} 個節點, ${Date.now() - this.searchStartTime}ms`
      );
      return bestMove;
    } catch (error) {
      console.error('🤖 AI思考錯誤:', error);
      // 退回到簡單策略
      return this.getSimpleMove(gameState);
    }
  }

  private getOpeningMove(gameState: GameState): { from: Position; to: Position } | null {
    const board = gameState.board;
    const moveHistory = gameState.moveHistory;

    // 如果還沒有任何移動，不應該使用開局庫（因為紅方先走）
    if (moveHistory.length === 0) {
      console.log('🤖 遊戲剛開始，等待紅方先走');
      return null;
    }

    // 新增：從棋譜庫找最佳應對
    const bestResponse = findBestOpeningResponse(moveHistory);
    if (bestResponse) {
      console.log('🤖 從棋譜庫找到最佳應對:', bestResponse);
      // 轉換為具體移動
      const move = findMoveFromNotation(bestResponse, board, PlayerColor.BLACK);
      if (move && this.isSafeMove(gameState, move.from, move.to)) {
        return move;
      }
    }

    // 獲取上一步紅方的移動
    const lastMove = moveHistory[moveHistory.length - 1];
    console.log('🤖 分析紅方走法:', lastMove);

    // 根據紅方的走法選擇回應
    const responses = this.OPENING_RESPONSES[lastMove] || this.OPENING_RESPONSES['default'];

    // 從回應列表中找到可行的移動
    for (const move of responses) {
      const piece = board[move.from.y][move.from.x];
      if (!piece || piece.color !== PlayerColor.BLACK) continue;

      const possibleMoves = this.chessGameService.getPossibleMoves(piece, board);
      const isValid = possibleMoves.some((pos) => pos.x === move.to.x && pos.y === move.to.y);

      // 重要：檢查移動是否安全，不會讓自己被將軍
      if (isValid && this.isSafeMove(gameState, move.from, move.to)) {
        console.log(`🤖 選擇安全回應走法: ${move.description}`, move);
        return move;
      } else if (isValid) {
        console.log(`⚠️ 跳過不安全的移動: ${move.description}`, move);
      }
    }

    console.log('🤖 沒有找到安全的回應走法，使用普通算法');
    return null;
  }

  private evaluatePosition(gameState: GameState): number {
    if (gameState.gameOver) {
      if (gameState.winner === PlayerColor.BLACK) return 8000;
      if (gameState.winner === PlayerColor.RED) return -8000;
      return 0; // 和棋
    }

    let score = 0;
    const board = gameState.board;

    // 新增：從棋譜中學習的位置評估 (權重8%)
    score += getPositionEvaluation(board) * 0.08;

    // 安全性評估 (權重50% - 大幅提高安全性權重，防止送死)
    score += this.evaluateSafety(board) * 0.5;

    // 材料平衡 (權重30%)
    score += this.evaluateMaterial(board) * 0.3;

    // 位置評估 (權重10%)
    score += this.evaluatePositions(board) * 0.1;

    // 棋子活動性 (權重2%)
    score += this.evaluateMobility(gameState) * 0.02;
    // 添加隨機擾動，避免完全一樣的評估
    score += (Math.random() - 0.5) * 2;

    return score;
  }

  // 其餘方法保持不變...
  private minimax(
    gameState: GameState,
    depth: number,
    alpha: number,
    beta: number,
    maximizingPlayer: boolean
  ): { score: number; bestMove?: { from: Position; to: Position } } {
    this.nodesSearched++;

    // 時間檢查
    if (Date.now() - this.searchStartTime > this.maxSearchTime) {
      return { score: this.evaluatePosition(gameState) };
    }

    // 深度到達或遊戲結束
    if (depth === 0 || gameState.gameOver) {
      return { score: this.evaluatePosition(gameState) };
    }

    const currentPlayer = maximizingPlayer ? PlayerColor.BLACK : PlayerColor.RED;
    const allMoves = this.getAllPossibleMoves(gameState, currentPlayer);
    if (allMoves.length === 0) {
      // 無法移動，可能是被將死 - 但這不應該發生在正常遊戲中
      console.warn('⚠️ AI找不到合法移動！目前玩家:', maximizingPlayer ? 'BLACK' : 'RED');
      return { score: maximizingPlayer ? -5000 : 5000 };
    }

    // 移動排序 - 優先搜尋較好的移動
    allMoves.sort((a, b) => {
      const scoreA = this.getMoveOrderScore(a, gameState.board);
      const scoreB = this.getMoveOrderScore(b, gameState.board);
      return maximizingPlayer ? scoreB - scoreA : scoreA - scoreB;
    });

    let bestMove: { from: Position; to: Position } | undefined;

    if (maximizingPlayer) {
      let maxEval = -Infinity;

      for (const move of allMoves) {
        // 對於AI（黑方），檢查移動是否安全
        if (!this.isSafeMove(gameState, move.from, move.to)) {
          continue; // 跳過不安全的移動
        }

        const newGameState = this.simulateMove(gameState, move.from, move.to);
        const evaluation = this.minimax(newGameState, depth - 1, alpha, beta, false);

        if (evaluation.score > maxEval) {
          maxEval = evaluation.score;
          bestMove = move;
        }

        alpha = Math.max(alpha, evaluation.score);
        if (beta <= alpha) break; // Alpha-Beta 剪枝
      }

      return { score: maxEval, bestMove };
    } else {
      let minEval = Infinity;

      for (const move of allMoves) {
        const newGameState = this.simulateMove(gameState, move.from, move.to);
        const evaluation = this.minimax(newGameState, depth - 1, alpha, beta, true);

        if (evaluation.score < minEval) {
          minEval = evaluation.score;
          bestMove = move;
        }

        beta = Math.min(beta, evaluation.score);
        if (beta <= alpha) break; // Alpha-Beta 剪枝
      }

      return { score: minEval, bestMove };
    }
  }

  private getAllPossibleMoves(
    gameState: GameState,
    color: PlayerColor
  ): { from: Position; to: Position }[] {
    const moves: { from: Position; to: Position }[] = [];
    const board = gameState.board;

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = board[y][x];
        if (piece && piece.color === color) {
          const possibleMoves = this.chessGameService.getPossibleMoves(piece, board);
          for (const moveTo of possibleMoves) {
            // 所有可能移動都是合法的，因為PossibleMoves已經檢查過了
            moves.push({ from: piece.position, to: moveTo });
          }
        }
      }
    }

    if (moves.length === 0) {
      console.warn(`⚠️ 沒有找到 ${color} 的任何可能移動！`);
    } else {
      console.log(`🎯 找到 ${color} 的 ${moves.length} 個可能移動`);
    }

    return moves;
  }

  private isLegalMove(gameState: GameState, from: Position, to: Position): boolean {
    const piece = gameState.board[from.y][from.x];
    if (!piece) return false;

    // 簡單檢查：直接使用遊戲服務的makeMove來驗證
    try {
      const testState = {
        ...gameState,
        board: gameState.board.map((row) => row.map((p) => (p ? { ...p } : null))),
      };

      const result = this.chessGameService.makeMove(testState, from, to);
      return result.success && !result.isSelfInCheck;
    } catch (error) {
      return false;
    }
  }

  // 檢查移動是否安全（不會讓自己被將軍）
  private isSafeMove(gameState: GameState, from: Position, to: Position): boolean {
    const piece = gameState.board[from.y][from.x];
    if (!piece || piece.color !== PlayerColor.BLACK) return false;

    try {
      // 深拷貝棋盤狀態
      const testBoard = gameState.board.map((row) =>
        row.map((p) => (p ? { ...p, position: { ...p.position } } : null))
      );

      // 模擬移動
      const testPiece = testBoard[from.y][from.x];
      if (!testPiece) return false;

      testBoard[to.y][to.x] = testPiece;
      testBoard[from.y][from.x] = null;
      testPiece.position = { x: to.x, y: to.y };

      // 檢查移動後黑方是否會被將軍
      const isInCheck = this.chessGameService.isInCheck(testBoard, PlayerColor.BLACK);

      if (isInCheck) {
        console.log(`⚠️ 危險移動被阻止: ${piece.type} 從 (${from.x},${from.y}) 到 (${to.x},${to.y}) - 會被將軍`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('安全性檢查出錯:', error);
      return false;
    }
  }

  private simulateMove(gameState: GameState, from: Position, to: Position): GameState {
    // 深拷貝遊戲狀態
    const newBoard = gameState.board.map((row) =>
      row.map((piece) => (piece ? { ...piece, position: { ...piece.position } } : null))
    );

    const piece = newBoard[from.y][from.x];
    if (!piece) return { ...gameState, board: newBoard };

    // 執行移動
    const capturedPiece = newBoard[to.y][to.x];
    newBoard[to.y][to.x] = piece;
    newBoard[from.y][from.x] = null;
    piece.position = { x: to.x, y: to.y };

    // 檢查遊戲是否結束
    const gameOver =
      capturedPiece?.type === PieceType.KING ||
      this.chessGameService.wouldKingsFaceEachOther(newBoard);

    const nextPlayer =
      gameState.currentPlayer === PlayerColor.RED ? PlayerColor.BLACK : PlayerColor.RED;

    return {
      ...gameState,
      board: newBoard,
      currentPlayer: nextPlayer,
      gameOver,
    };
  }

  private evaluateMaterial(board: (ChessPiece | null)[][]): number {
    let score = 0;

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = board[y][x];
        if (piece) {
          const pieceValue = getPieceValue(piece.type, x, y, piece.color);
          score += piece.color === PlayerColor.BLACK ? pieceValue : -pieceValue;
        }
      }
    }

    return score;
  }

  private evaluatePositions(board: (ChessPiece | null)[][]): number {
    let score = 0;

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = board[y][x];
        if (piece) {
          const positionBonus = getPositionBonus(piece.type, x, y, piece.color);
          score += piece.color === PlayerColor.BLACK ? positionBonus : -positionBonus;
        }
      }
    }

    return score;
  }

  private evaluateMobility(gameState: GameState): number {
    const blackMoves = this.getAllPossibleMoves(gameState, PlayerColor.BLACK).length;
    const redMoves = this.getAllPossibleMoves(gameState, PlayerColor.RED).length;

    return (blackMoves - redMoves) * 2; // 活動性權重
  }

  private evaluateSafety(board: (ChessPiece | null)[][]): number {
    let score = 0;

    // 檢查王的安全性 - 這是最重要的！
    const blackInCheck = this.chessGameService.isInCheck(board, PlayerColor.BLACK);
    const redInCheck = this.chessGameService.isInCheck(board, PlayerColor.RED);

    if (blackInCheck) {
      score -= 1000; // 黑方被將軍是非常危險的
      console.warn('⚠️ 黑方被將軍！');
    }
    if (redInCheck) {
      score += 500; // 將軍對方是好事
      console.log('✅ 成功將軍紅方');
    }

    // 檢查王周圍的安全性
    score += this.evaluateKingSafety(board, PlayerColor.BLACK) * -1; // 黑方王安全性
    score += this.evaluateKingSafety(board, PlayerColor.RED); // 紅方王安全性

    return score;
  }

  private evaluateKingSafety(board: (ChessPiece | null)[][], color: PlayerColor): number {
    let danger = 0;

    // 找到王的位置
    let kingPos: Position | null = null;
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = board[y][x];
        if (piece && piece.type === PieceType.KING && piece.color === color) {
          kingPos = { x, y };
          break;
        }
      }
      if (kingPos) break;
    }

    if (!kingPos) return 0;

    // 檢查敵方棋子對王的威脅
    const enemyColor = color === PlayerColor.RED ? PlayerColor.BLACK : PlayerColor.RED;
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = board[y][x];
        if (piece && piece.color === enemyColor) {
          const moves = this.chessGameService.getPossibleMovesForCheck(piece, board);
          for (const move of moves) {
            if (move.x === kingPos.x && move.y === kingPos.y) {
              // 這個敵方棋子可以攻擊王
              danger += PIECE_VALUES[piece.type] / 100;
            }
          }
        }
      }
    }

    return danger;
  }

  private getMoveOrderScore(
    move: { from: Position; to: Position },
    board: (ChessPiece | null)[][]
  ): number {
    let score = 0;

    const piece = board[move.from.y][move.from.x];
    const target = board[move.to.y][move.to.x];

    if (!piece) return score;

    // 優先吃子
    if (target) {
      const captureValue = PIECE_VALUES[target.type] - PIECE_VALUES[piece.type];
      score += captureValue * 10;
    }

    // 優先往中心移動
    const centerDistance = Math.abs(move.to.x - 4) + Math.abs(move.to.y - 4.5);
    score -= centerDistance;

    return score;
  }

  private getSimpleMove(gameState: GameState): { from: Position; to: Position } | null {
    // 簡單策略：隨機選擇一個合法且安全的移動
    const allMoves = this.getAllPossibleMoves(gameState, PlayerColor.BLACK);

    console.log(`🎲 簡單策略找到 ${allMoves.length} 個移動`);

    if (allMoves.length === 0) {
      console.error('🚨 連簡單策略都找不到任何移動！');
      return null;
    }

    // 過濾出安全的移動
    const safeMoves = allMoves.filter((move) => this.isSafeMove(gameState, move.from, move.to));

    console.log(`🛡️ 其中 ${safeMoves.length} 個是安全移動`);

    if (safeMoves.length === 0) {
      console.warn('⚠️ 沒有安全移動，可能被困！嘗試任何移動...');
      // 如果沒有安全移動，可能是被困了，嘗試任何移動
      const selectedMove = allMoves[Math.floor(Math.random() * allMoves.length)];
      console.log('🎯 被迫選擇移動:', selectedMove);
      return selectedMove;
    }

    // 優先選擇安全的吃子移動
    const safeCaptureMoves = safeMoves.filter((move) => {
      const target = gameState.board[move.to.y][move.to.x];
      return target && target.color === PlayerColor.RED;
    });

    const candidateMoves = safeCaptureMoves.length > 0 ? safeCaptureMoves : safeMoves;
    const selectedMove = candidateMoves[Math.floor(Math.random() * candidateMoves.length)];

    console.log('🎯 簡單策略選擇安全移動:', selectedMove);
    return selectedMove;
  }

  setDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
    switch (difficulty) {
      case 'easy':
        this.maxDepth = 2;
        this.maxSearchTime = 1000;
        break;
      case 'medium':
        this.maxDepth = 4;
        this.maxSearchTime = 3000;
        break;
      case 'hard':
        this.maxDepth = 6;
        this.maxSearchTime = 5000;
        break;
    }
  }

  getThinkingDescription(gameState: GameState): string {
    const moveCount = gameState.moveHistory.length;

    if (moveCount === 0) {
      return '🤖 AI等待紅方先走...';
    } else if (moveCount <= 8 && moveCount > 0) {
      return '🤖 AI正在分析開局回應...';
    } else if (moveCount < 20) {
      return '🤖 AI正在布局發展...';
    } else if (moveCount < 40) {
      return '🤖 AI正在制定中盤戰略...';
    } else {
      return '🤖 AI正在計算殘局...';
    }
  }
}
