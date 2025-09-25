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
      // 使用整合式策略：開局庫 + Minimax 混合評估
      if (gameState.moveHistory.length > 0 && gameState.moveHistory.length <= 20) {
        const hybridMove = this.getHybridMove(gameState);
        if (hybridMove) {
          console.log('🤖 使用混合策略移動:', hybridMove);
          return hybridMove;
        }
      }

      // 純 Minimax 搜尋（20步後）
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

  // 新增：混合策略 - 開局庫候選 + Minimax評估
  private getHybridMove(gameState: GameState): { from: Position; to: Position } | null {
    console.log('🤖 使用混合策略分析...');

    // 1. 從開局庫獲取候選移動
    const openingCandidates = this.getOpeningCandidates(gameState);

    // 2. 從Minimax獲取候選移動
    const minimaxCandidates = this.getMinimaxCandidates(gameState, 2); // 淺搜尋獲取候選

    // 3. 合併候選移動（去重）
    const allCandidates = this.mergeCandidates(openingCandidates, minimaxCandidates);

    if (allCandidates.length === 0) {
      console.log('🤖 混合策略未找到候選移動');
      return null;
    }

    // 4. 對所有候選移動進行混合評估
    const evaluatedMoves = allCandidates.map(move => ({
      ...move,
      hybridScore: this.evaluateHybridMove(gameState, move)
    }));

    // 5. 選擇最佳移動
    evaluatedMoves.sort((a, b) => b.hybridScore - a.hybridScore);
    const bestMove = evaluatedMoves[0];

    console.log(`🤖 混合策略評估了 ${allCandidates.length} 個候選，最佳分數: ${bestMove.hybridScore}`);

    return { from: bestMove.from, to: bestMove.to };
  }

  // 獲取開局庫候選移動
  private getOpeningCandidates(gameState: GameState): { from: Position; to: Position }[] {
    const candidates: { from: Position; to: Position }[] = [];
    const board = gameState.board;
    const moveHistory = gameState.moveHistory;

    if (moveHistory.length === 0) return candidates;

    // 從棋譜庫找最佳應對
    const bestResponse = findBestOpeningResponse(moveHistory);
    if (bestResponse) {
      const move = findMoveFromNotation(bestResponse, board, PlayerColor.BLACK);
      if (move && this.isSafeMove(gameState, move.from, move.to)) {
        candidates.push(move);
      }
    }

    // 從標準回應中獲取候選
    const lastMove = moveHistory[moveHistory.length - 1];
    const responses = this.OPENING_RESPONSES[lastMove] || this.OPENING_RESPONSES['default'];

    for (const response of responses.slice(0, 3)) { // 只取前3個最佳回應
      const piece = board[response.from.y][response.from.x];
      if (!piece || piece.color !== PlayerColor.BLACK) continue;

      const possibleMoves = this.chessGameService.getPossibleMoves(piece, board);
      const isValid = possibleMoves.some((pos) => pos.x === response.to.x && pos.y === response.to.y);

      if (isValid && this.isSafeMove(gameState, response.from, response.to)) {
        candidates.push({ from: response.from, to: response.to });
      }
    }

    return candidates;
  }

  // 獲取Minimax候選移動
  private getMinimaxCandidates(gameState: GameState, depth: number): { from: Position; to: Position }[] {
    const allMoves = this.getAllPossibleMoves(gameState, PlayerColor.BLACK);
    const safeMoves = allMoves.filter(move => this.isSafeMove(gameState, move.from, move.to));

    // 快速評估並排序，取前5個候選
    const evaluatedMoves = safeMoves.map(move => ({
      ...move,
      score: this.quickEvaluateMove(gameState, move)
    }));

    evaluatedMoves.sort((a, b) => b.score - a.score);
    return evaluatedMoves.slice(0, 5).map(move => ({ from: move.from, to: move.to }));
  }

  // 合併候選移動（去重）
  private mergeCandidates(
    opening: { from: Position; to: Position }[],
    minimax: { from: Position; to: Position }[]
  ): { from: Position; to: Position }[] {
    const merged: { from: Position; to: Position }[] = [...opening];

    for (const move of minimax) {
      const isDuplicate = merged.some(existing =>
        existing.from.x === move.from.x && existing.from.y === move.from.y &&
        existing.to.x === move.to.x && existing.to.y === move.to.y
      );

      if (!isDuplicate) {
        merged.push(move);
      }
    }

    return merged;
  }

  // 混合評估單個移動
  private evaluateHybridMove(gameState: GameState, move: { from: Position; to: Position }): number {
    const moveCount = gameState.moveHistory.length;

    // 計算開局庫權重（隨步數遞減）
    const openingWeight = Math.max(0, (20 - moveCount) / 20); // 20步內從1.0遞減到0
    const minimaxWeight = 1 - openingWeight;

    // 開局庫評分（基於開局理論）
    const openingScore = this.evaluateOpeningMove(gameState, move);

    // Minimax評分（基於戰術計算）
    const minimaxScore = this.evaluateMinimaxMove(gameState, move, 3); // 深度3搜尋

    // 混合分數
    const hybridScore = openingScore * openingWeight + minimaxScore * minimaxWeight;

    console.log(`🔍 移動 (${move.from.x},${move.from.y})->(${move.to.x},${move.to.y}): 開局${openingScore.toFixed(1)}(${(openingWeight*100).toFixed(0)}%) + Minimax${minimaxScore.toFixed(1)}(${(minimaxWeight*100).toFixed(0)}%) = ${hybridScore.toFixed(1)}`);

    return hybridScore;
  }

  // 評估開局移動（基於開局原則）
  private evaluateOpeningMove(gameState: GameState, move: { from: Position; to: Position }): number {
    let score = 0;
    const piece = gameState.board[move.from.y][move.from.x];
    const target = gameState.board[move.to.y][move.to.x];

    if (!piece) return score;

    // 開局原則評分

    // 1. 快速出子（馬、炮優先）
    if (piece.type === PieceType.HORSE || piece.type === PieceType.CANNON) {
      score += 50;
    }

    // 2. 控制中心
    const centerDistance = Math.abs(move.to.x - 4) + Math.abs(move.to.y - 4.5);
    score += (9 - centerDistance) * 10;

    // 3. 不要過早出動大子
    if (piece.type === PieceType.ROOK && gameState.moveHistory.length < 6) {
      score -= 30;
    }

    // 4. 保護王的安全
    if (piece.type === PieceType.ADVISOR || piece.type === PieceType.ELEPHANT) {
      score += 20;
    }

    // 5. 吃子獎勵
    if (target) {
      score += PIECE_VALUES[target.type] / 10;
    }

    return score;
  }

  // 評估Minimax移動
  private evaluateMinimaxMove(gameState: GameState, move: { from: Position; to: Position }, depth: number): number {
    const newGameState = this.simulateMove(gameState, move.from, move.to);
    const result = this.minimax(newGameState, depth - 1, -Infinity, Infinity, false);
    return result.score;
  }

  // 快速評估移動（用於候選生成）
  private quickEvaluateMove(gameState: GameState, move: { from: Position; to: Position }): number {
    const newGameState = this.simulateMove(gameState, move.from, move.to);
    return this.evaluatePosition(newGameState);
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
      return '🤖 AI正在分析開局理論與戰術結合...';
    } else if (moveCount <= 20) {
      return '🤖 AI正在使用混合策略布局...';
    } else if (moveCount < 40) {
      return '🤖 AI正在制定中盤戰略...';
    } else {
      return '🤖 AI正在計算殘局...';
    }
  }
}
