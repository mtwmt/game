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
  // 簡單的遊戲模式學習存儲
  private gameMemory: {
    playerMoves: Array<{ from: Position; to: Position; evaluation: number }>;
    playerPreferences: {
      aggressive: number;
      defensive: number;
      positional: number;
    };
    gameCount: number;
  } = {
    playerMoves: [],
    playerPreferences: {
      aggressive: 0.5,
      defensive: 0.5,
      positional: 0.5
    },
    gameCount: 0
  };

  constructor(private chessGameService: ChessGameService) {
    // 嘗試從localStorage載入學習數據
    this.loadGameMemory();
  }

  // AI思考深度
  private readonly MAX_DEPTH = 3;

  // 開局庫 - 常見象棋開局走法
  private readonly OPENING_BOOK = [
    // 當頭炮開局
    [
      { from: { x: 7, y: 2 }, to: { x: 7, y: 4 }, name: '七路炮開局' },
      { from: { x: 1, y: 2 }, to: { x: 1, y: 4 }, name: '二路炮開局' },
    ],
    // 飛象局
    [
      { from: { x: 2, y: 0 }, to: { x: 4, y: 2 }, name: '起飛象' },
      { from: { x: 6, y: 0 }, to: { x: 4, y: 2 }, name: '起飛象' },
    ],
    // 進馬開局
    [
      { from: { x: 1, y: 0 }, to: { x: 2, y: 2 }, name: '左馬出動' },
      { from: { x: 7, y: 0 }, to: { x: 6, y: 2 }, name: '右馬出動' },
    ],
    // 士角炮開局
    [
      { from: { x: 1, y: 2 }, to: { x: 4, y: 2 }, name: '士角炮' },
      { from: { x: 7, y: 2 }, to: { x: 4, y: 2 }, name: '士角炮' },
    ]
  ];

  // 常見中局模式
  private readonly PATTERNS = {
    // 攻擊模式
    ATTACK_PATTERNS: [
      '雙車歸邊', '炮打中兵', '馬後炮', '雙炮過河'
    ],
    // 防守模式
    DEFENSE_PATTERNS: [
      '屏風馬', '反宮馬', '龜背炮', '鐵滑車'
    ]
  };

  // AI個性參數
  private readonly AI_PERSONALITY = {
    AGGRESSIVE: 0.8,    // 攻擊性
    CAUTIOUS: 0.6,      // 謹慎性
    CREATIVE: 0.7,      // 創造性
    CONSISTENCY: 0.5    // 一致性（低一致性 = 更多變化）
  };

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

    // 檢查是否被將軍，如果是則使用緊急防守
    const isInCheck = this.chessGameService.isInCheck(gameState.board, PlayerColor.BLACK);

    if (isInCheck) {
      console.log('🤖 AI被將軍！優先考慮防守動作...');
      const emergencyMove = this.findEmergencyDefenseMove(gameState, allMoves);
      if (emergencyMove) {
        console.log(`🤖 AI緊急防守: (${emergencyMove.from.x},${emergencyMove.from.y}) -> (${emergencyMove.to.x},${emergencyMove.to.y})`);
        return emergencyMove;
      }
    }

    // 檢查是否可以使用開局庫
    const openingMove = this.tryOpeningBook(gameState);
    if (openingMove) {
      console.log(`🤖 AI使用開局庫: ${openingMove.name}`);
      return openingMove;
    }

    const searchDepth = isInCheck ? Math.min(2, this.MAX_DEPTH) : this.MAX_DEPTH;
    console.log(`🤖 AI${isInCheck ? '被將軍，' : ''}使用深度 ${searchDepth} 進行搜索`);

    const bestMove = this.findBestMoveWithTimeout(gameState, searchDepth, 20000); // 20秒超時

    if (bestMove) {
      // 添加隨機性和多樣性選擇
      const finalMove = this.addMoveVariety(gameState, bestMove, allMoves);

      console.log(
        `🤖 AI決定移動: (${finalMove.from.x},${finalMove.from.y}) -> (${finalMove.to.x},${finalMove.to.y}), 評分: ${finalMove.score || 'varied'}`
      );
      return {
        from: finalMove.from,
        to: finalMove.to,
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

  private findEmergencyDefenseMove(gameState: GameState, allMoves: MoveEvaluation[]): { from: Position; to: Position } | null {
    const board = gameState.board;

    // 找到AI的王
    let aiKing: ChessPiece | null = null;
    for (let y = 0; y < 10 && !aiKing; y++) {
      for (let x = 0; x < 9 && !aiKing; x++) {
        const piece = board[y][x];
        if (piece && piece.color === PlayerColor.BLACK && piece.type === PieceType.KING) {
          aiKing = piece;
        }
      }
    }

    if (!aiKing) return null;

    // 1. 嘗試移動王到安全位置
    const kingMoves = allMoves.filter(move =>
      move.from.x === aiKing!.position.x && move.from.y === aiKing!.position.y
    );

    for (const move of kingMoves) {
      // 模擬移動後檢查是否安全
      const newGameState = this.simulateMove(gameState, move);
      if (!this.chessGameService.isInCheck(newGameState.board, PlayerColor.BLACK)) {
        return { from: move.from, to: move.to };
      }
    }

    // 2. 尋找能攔截威脅的移動
    const blockingMoves = this.findBlockingMoves(gameState, allMoves, aiKing);
    if (blockingMoves.length > 0) {
      // 選擇最佳攔截移動
      return { from: blockingMoves[0].from, to: blockingMoves[0].to };
    }

    // 3. 嘗試吃掉威脅棋子
    const captureMoves = this.findCaptureThreatMoves(gameState, allMoves, aiKing);
    if (captureMoves.length > 0) {
      return { from: captureMoves[0].from, to: captureMoves[0].to };
    }

    return null;
  }

  private findBlockingMoves(gameState: GameState, allMoves: MoveEvaluation[], aiKing: ChessPiece): MoveEvaluation[] {
    const blockingMoves: MoveEvaluation[] = [];

    // 找到所有威脅王的敵方棋子
    const threats = this.findThreatsToKing(gameState.board, aiKing);

    for (const threat of threats) {
      // 對每個威脅，尋找能夠攔截的移動
      const interceptPositions = this.getInterceptPositions(threat.position, aiKing.position);

      for (const move of allMoves) {
        if (interceptPositions.some(pos => pos.x === move.to.x && pos.y === move.to.y)) {
          // 確認這個移動真的能解除將軍
          const newGameState = this.simulateMove(gameState, move);
          if (!this.chessGameService.isInCheck(newGameState.board, PlayerColor.BLACK)) {
            blockingMoves.push(move);
          }
        }
      }
    }

    return blockingMoves;
  }

  private findCaptureThreatMoves(gameState: GameState, allMoves: MoveEvaluation[], aiKing: ChessPiece): MoveEvaluation[] {
    const captureMoves: MoveEvaluation[] = [];

    // 找到所有威脅王的敵方棋子
    const threats = this.findThreatsToKing(gameState.board, aiKing);

    for (const threat of threats) {
      for (const move of allMoves) {
        // 檢查是否能吃掉威脅棋子
        if (move.to.x === threat.position.x && move.to.y === threat.position.y) {
          // 確認吃掉後能解除將軍
          const newGameState = this.simulateMove(gameState, move);
          if (!this.chessGameService.isInCheck(newGameState.board, PlayerColor.BLACK)) {
            captureMoves.push(move);
          }
        }
      }
    }

    return captureMoves;
  }

  private findThreatsToKing(board: (ChessPiece | null)[][], aiKing: ChessPiece): ChessPiece[] {
    const threats: ChessPiece[] = [];

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = board[y][x];
        if (piece && piece.color === PlayerColor.RED) {
          const moves = this.chessGameService.getPossibleMovesForCheck(piece, board);
          if (moves.some(move => move.x === aiKing.position.x && move.y === aiKing.position.y)) {
            threats.push(piece);
          }
        }
      }
    }

    return threats;
  }

  private getInterceptPositions(threatPos: Position, kingPos: Position): Position[] {
    const positions: Position[] = [];

    // 計算威脅棋子到王之間的路徑
    const dx = kingPos.x - threatPos.x;
    const dy = kingPos.y - threatPos.y;

    // 只處理直線威脅（車、炮）或對角線威脅（在象棋中較少見）
    if (dx === 0) {
      // 垂直線
      const step = dy > 0 ? 1 : -1;
      for (let y = threatPos.y + step; y !== kingPos.y; y += step) {
        positions.push({ x: threatPos.x, y });
      }
    } else if (dy === 0) {
      // 水平線
      const step = dx > 0 ? 1 : -1;
      for (let x = threatPos.x + step; x !== kingPos.x; x += step) {
        positions.push({ x, y: threatPos.y });
      }
    }

    return positions;
  }

  private tryOpeningBook(gameState: GameState): { from: Position; to: Position; name?: string } | null {
    const moveCount = gameState.moveHistory.length;

    // 只在開局前6步使用開局庫
    if (moveCount >= 6) return null;

    // 30% 機率使用開局庫，增加變化
    if (Math.random() > 0.3) return null;

    // 隨機選擇一個開局類型
    const openingType = this.OPENING_BOOK[Math.floor(Math.random() * this.OPENING_BOOK.length)];

    // 從該開局類型中隨機選擇一個變化
    const opening = openingType[Math.floor(Math.random() * openingType.length)];

    // 檢查開局移動是否合法
    const piece = gameState.board[opening.from.y][opening.from.x];
    if (piece && piece.color === PlayerColor.BLACK) {
      const possibleMoves = this.chessGameService.getPossibleMoves(piece, gameState.board);
      const isValidMove = possibleMoves.some(move => move.x === opening.to.x && move.y === opening.to.y);

      if (isValidMove && !this.wouldMoveCauseSelfCheck(gameState, opening.from, opening.to)) {
        return { from: opening.from, to: opening.to, name: opening.name };
      }
    }

    return null;
  }

  private addMoveVariety(gameState: GameState, bestMove: MoveEvaluation, allMoves: MoveEvaluation[]): MoveEvaluation {
    // 根據AI個性決定是否選擇變化
    if (Math.random() > this.AI_PERSONALITY.CONSISTENCY) {

      // 評估所有移動並按分數排序
      for (const move of allMoves) {
        const newGameState = this.simulateMove(gameState, move);
        move.score = this.evaluateBoard(newGameState);
      }

      // 排序得到最佳移動們
      allMoves.sort((a, b) => (b.score || 0) - (a.score || 0));

      // 從前3個最佳移動中隨機選擇（如果分數差距不大）
      const topMoves = allMoves.slice(0, 3);
      const bestScore = topMoves[0]?.score || 0;

      const viableMoves = topMoves.filter(move =>
        Math.abs((move.score || 0) - bestScore) <= bestScore * 0.1 // 分數差距在10%內
      );

      if (viableMoves.length > 1) {
        const selectedMove = viableMoves[Math.floor(Math.random() * viableMoves.length)];
        console.log(`🤖 AI選擇變化走法，從${viableMoves.length}個相近選項中選擇`);
        return selectedMove;
      }
    }

    // 加入創造性移動的可能性
    if (Math.random() < this.AI_PERSONALITY.CREATIVE * 0.2) {
      const creativeMoves = this.findCreativeMoves(gameState, allMoves);
      if (creativeMoves.length > 0) {
        const creativeMove = creativeMoves[Math.floor(Math.random() * creativeMoves.length)];
        console.log('🤖 AI嘗試創意走法');
        return creativeMove;
      }
    }

    return bestMove;
  }

  private findCreativeMoves(gameState: GameState, allMoves: MoveEvaluation[]): MoveEvaluation[] {
    const creativeMoves: MoveEvaluation[] = [];

    for (const move of allMoves) {
      const piece = gameState.board[move.from.y][move.from.x];
      if (!piece) continue;

      // 識別一些創意移動模式
      let isCreative = false;

      // 1. 棋子深入敵陣
      if (piece.color === PlayerColor.BLACK && move.to.y > 6) {
        isCreative = true;
      }

      // 2. 意外的棋子移動（如象、士出宮攻擊）
      if (piece.type === PieceType.ELEPHANT || piece.type === PieceType.ADVISOR) {
        const distanceFromHome = Math.abs(move.to.y - (piece.color === PlayerColor.BLACK ? 0 : 9));
        if (distanceFromHome > 3) {
          isCreative = true;
        }
      }

      // 3. 捨棋造勢
      if (move.capturedPiece && this.PIECE_VALUES[piece.type] > this.PIECE_VALUES[move.capturedPiece.type] * 1.5) {
        isCreative = true;
      }

      if (isCreative) {
        creativeMoves.push(move);
      }
    }

    return creativeMoves;
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

            // 檢查移動後是否會讓自己被將軍（自殺移動）
            if (!this.wouldMoveCauseSelfCheck(gameState, piece.position, to)) {
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
    }

    return moves;
  }

  private wouldMoveCauseSelfCheck(gameState: GameState, from: Position, to: Position): boolean {
    const board = gameState.board;
    const piece = board[from.y][from.x];
    if (!piece) return true; // 無效移動

    // 臨時執行移動
    const originalTarget = board[to.y][to.x];
    const originalPos = piece.position;

    board[to.y][to.x] = piece;
    board[from.y][from.x] = null;
    piece.position = to;

    // 檢查是否被將軍
    const inCheck = this.chessGameService.isInCheck(board, piece.color);

    // 還原移動
    board[from.y][from.x] = piece;
    board[to.y][to.x] = originalTarget;
    piece.position = originalPos;

    return inCheck;
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

    // 1. 基本棋子價值評估（最重要）
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = gameState.board[y][x];
        if (piece) {
          let pieceScore = this.PIECE_VALUES[piece.type];

          // 簡化的位置獎勵
          pieceScore += this.getSimplePositionBonus(piece);

          // 根據顏色調整分數 (黑方AI，所以黑方正分，紅方負分)
          if (piece.color === PlayerColor.BLACK) {
            score += pieceScore;
          } else {
            score -= pieceScore;
          }
        }
      }
    }

    // 2. 將軍檢測評分（高優先級）
    if (this.chessGameService.isInCheck(gameState.board, PlayerColor.RED)) {
      score += 300; // 將軍對方獎勵
    }
    if (this.chessGameService.isInCheck(gameState.board, PlayerColor.BLACK)) {
      score -= 300; // 被將軍懲罰
    }

    // 3. 簡化的安全性檢查
    score += this.getBasicSafetyScore(gameState.board);

    return score;
  }

  private getSimplePositionBonus(piece: ChessPiece): number {
    const { x, y } = piece.position;
    let bonus = 0;

    // 基本中央控制獎勵
    const centerDistance = Math.abs(y - 4.5) + Math.abs(x - 4);
    bonus += Math.max(0, (9 - centerDistance) * 2);

    // 兵過河獎勵
    if (piece.type === PieceType.SOLDIER) {
      const hasPassedRiver = (piece.color === PlayerColor.RED && y < 5) ||
                           (piece.color === PlayerColor.BLACK && y > 4);
      if (hasPassedRiver) {
        bonus += 30;
      }
    }

    return bonus;
  }

  private getBasicSafetyScore(board: (ChessPiece | null)[][]): number {
    let score = 0;

    // 只檢查最重要的棋子安全性
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = board[y][x];
        if (piece && piece.color === PlayerColor.BLACK) {
          const pieceValue = this.PIECE_VALUES[piece.type];

          // 只關心高價值棋子的安全
          if (pieceValue >= 400) {
            const isThreatened = this.isSimpleThreatened(x, y, piece, board);
            if (isThreatened) {
              score -= Math.min(100, pieceValue * 0.2); // 限制懲罰上限
            }
          }
        }
      }
    }

    return score;
  }

  private isSimpleThreatened(x: number, y: number, piece: ChessPiece, board: (ChessPiece | null)[][]): boolean {
    // 簡化的威脅檢測
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const enemy = board[r][c];
        if (enemy && enemy.color === PlayerColor.RED) {
          const enemyMoves = this.chessGameService.getPossibleMovesForCheck(enemy, board);
          if (enemyMoves.some(move => move.x === x && move.y === y)) {
            return true;
          }
        }
      }
    }
    return false;
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

  private getDefenseScore(board: (ChessPiece | null)[][]): number {
    let score = 0;

    // 1. 檢查AI重要棋子是否受到保護
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = board[y][x];
        if (piece && piece.color === PlayerColor.BLACK) {
          // 重要棋子需要保護
          const pieceValue = this.PIECE_VALUES[piece.type];
          if (pieceValue >= 400) { // 馬、車、炮、將
            const isProtected = this.isPieceProtected(x, y, piece, board);
            const isThreatenend = this.isPieceThreatened(x, y, piece, board);

            if (isThreatenend && !isProtected) {
              score -= pieceValue * 0.3; // 重要棋子被威脅且無保護
            } else if (isProtected && isThreatenend) {
              score += 50; // 被威脅但有保護
            }
          }
        }
      }
    }

    // 2. 檢查是否能攔截敵方威脅
    score += this.getInterceptionScore(board);

    // 3. 檢查王的安全性
    score += this.getKingSafetyScore(board);

    return score;
  }

  private isPieceProtected(x: number, y: number, piece: ChessPiece, board: (ChessPiece | null)[][]): boolean {
    // 檢查是否有己方棋子能保護這個位置
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const defender = board[r][c];
        if (defender && defender.color === piece.color && defender !== piece) {
          const defenderMoves = this.chessGameService.getPossibleMovesForCheck(defender, board);
          if (defenderMoves.some(move => move.x === x && move.y === y)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private isPieceThreatened(x: number, y: number, piece: ChessPiece, board: (ChessPiece | null)[][]): boolean {
    const enemyColor = piece.color === PlayerColor.RED ? PlayerColor.BLACK : PlayerColor.RED;

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const enemy = board[r][c];
        if (enemy && enemy.color === enemyColor) {
          const enemyMoves = this.chessGameService.getPossibleMovesForCheck(enemy, board);
          if (enemyMoves.some(move => move.x === x && move.y === y)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private getInterceptionScore(board: (ChessPiece | null)[][]): number {
    let score = 0;

    // 檢查敵方是否有強力攻擊線路，AI是否能攔截
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const enemy = board[y][x];
        if (enemy && enemy.color === PlayerColor.RED) {
          const enemyMoves = this.chessGameService.getPossibleMovesForCheck(enemy, board);

          // 檢查敵方是否威脅AI的高價值棋子
          for (const move of enemyMoves) {
            const target = board[move.y][move.x];
            if (target && target.color === PlayerColor.BLACK && this.PIECE_VALUES[target.type] >= 400) {
              // 敵方威脅AI重要棋子，檢查AI是否能攔截或反擊
              const canCounter = this.canCounterThreat(x, y, move.x, move.y, board);
              if (canCounter) {
                score += 80; // 能反擊的獎勵
              }
            }
          }
        }
      }
    }

    return score;
  }

  private canCounterThreat(enemyX: number, enemyY: number, targetX: number, targetY: number, board: (ChessPiece | null)[][]): boolean {
    // 檢查AI是否能攻擊威脅源或保護目標
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const aiPiece = board[y][x];
        if (aiPiece && aiPiece.color === PlayerColor.BLACK) {
          const aiMoves = this.chessGameService.getPossibleMovesForCheck(aiPiece, board);

          // 可以攻擊敵方威脅源
          if (aiMoves.some(move => move.x === enemyX && move.y === enemyY)) {
            return true;
          }

          // 可以保護被威脅的目標
          if (aiMoves.some(move => move.x === targetX && move.y === targetY)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private getKingSafetyScore(board: (ChessPiece | null)[][]): number {
    let score = 0;

    // 找到AI的王
    let aiKing: ChessPiece | null = null;
    for (let y = 0; y < 10 && !aiKing; y++) {
      for (let x = 0; x < 9 && !aiKing; x++) {
        const piece = board[y][x];
        if (piece && piece.color === PlayerColor.BLACK && piece.type === PieceType.KING) {
          aiKing = piece;
        }
      }
    }

    if (aiKing) {
      const { x, y } = aiKing.position;

      // 檢查王周圍是否有己方棋子保護
      const surroundingPositions = [
        { x: x-1, y: y-1 }, { x, y: y-1 }, { x: x+1, y: y-1 },
        { x: x-1, y }, { x: x+1, y },
        { x: x-1, y: y+1 }, { x, y: y+1 }, { x: x+1, y: y+1 }
      ];

      let protectors = 0;
      for (const pos of surroundingPositions) {
        if (pos.x >= 3 && pos.x <= 5 && pos.y >= 0 && pos.y <= 2) { // 在宮內
          const piece = board[pos.y]?.[pos.x];
          if (piece && piece.color === PlayerColor.BLACK) {
            protectors++;
          }
        }
      }

      // 王周圍有保護棋子是好的
      score += protectors * 15;

      // 檢查王是否被多個敵方棋子威脅
      let threatCount = 0;
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
          const enemy = board[r][c];
          if (enemy && enemy.color === PlayerColor.RED) {
            const enemyMoves = this.chessGameService.getPossibleMovesForCheck(enemy, board);
            if (enemyMoves.some(move => move.x === x && move.y === y)) {
              threatCount++;
            }
          }
        }
      }

      if (threatCount > 1) {
        score -= 200; // 被多重威脅很危險
      } else if (threatCount === 1) {
        score -= 100; // 被單一威脅
      }
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

  // 學習系統相關方法
  private loadGameMemory(): void {
    try {
      // 檢查是否在瀏覽器環境
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('chinese-chess-ai-memory');
        if (stored) {
          this.gameMemory = { ...this.gameMemory, ...JSON.parse(stored) };
          console.log(`🤖 AI載入了${this.gameMemory.gameCount}局遊戲的學習數據`);
        }
      }
    } catch (error) {
      console.warn('🤖 AI學習數據載入失敗:', error);
    }
  }

  private saveGameMemory(): void {
    try {
      // 檢查是否在瀏覽器環境
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('chinese-chess-ai-memory', JSON.stringify(this.gameMemory));
      }
    } catch (error) {
      console.warn('🤖 AI學習數據保存失敗:', error);
    }
  }

  // 公開方法：學習玩家移動
  learnFromPlayerMove(from: Position, to: Position, gameState: GameState): void {
    if (this.gameMemory.playerMoves.length > 1000) {
      // 限制記憶容量，移除最舊的記錄
      this.gameMemory.playerMoves.shift();
    }

    // 評估玩家移動的特性
    const moveEvaluation = this.evaluatePlayerMoveStyle(from, to, gameState);

    this.gameMemory.playerMoves.push({
      from,
      to,
      evaluation: moveEvaluation.score
    });

    // 更新玩家偏好統計
    this.gameMemory.playerPreferences.aggressive += moveEvaluation.aggressive * 0.1;
    this.gameMemory.playerPreferences.defensive += moveEvaluation.defensive * 0.1;
    this.gameMemory.playerPreferences.positional += moveEvaluation.positional * 0.1;

    // 保持偏好值在合理範圍內
    Object.keys(this.gameMemory.playerPreferences).forEach(key => {
      const k = key as keyof typeof this.gameMemory.playerPreferences;
      this.gameMemory.playerPreferences[k] = Math.max(0.1, Math.min(0.9, this.gameMemory.playerPreferences[k]));
    });

    this.saveGameMemory();
  }

  private evaluatePlayerMoveStyle(from: Position, to: Position, gameState: GameState): {
    score: number;
    aggressive: number;
    defensive: number;
    positional: number;
  } {
    const piece = gameState.board[from.y][from.x];
    let aggressive = 0;
    let defensive = 0;
    let positional = 0;

    if (!piece) return { score: 0, aggressive: 0, defensive: 0, positional: 0 };

    // 分析移動特性
    const capturedPiece = gameState.board[to.y][to.x];

    // 攻擊性特徵
    if (capturedPiece) {
      aggressive += 0.8; // 吃子
    }
    if (to.y > 5) { // 深入敵陣
      aggressive += 0.6;
    }

    // 防守性特徵
    if (to.y < 3) { // 保持在己方陣地
      defensive += 0.7;
    }
    if (piece.type === PieceType.ADVISOR || piece.type === PieceType.ELEPHANT) {
      defensive += 0.5; // 使用防守棋子
    }

    // 位置性特徵
    const centerDistance = Math.abs(to.x - 4) + Math.abs(to.y - 4.5);
    if (centerDistance < 3) {
      positional += 0.8; // 控制中央
    }

    const score = aggressive * 0.4 + defensive * 0.3 + positional * 0.3;

    return { score, aggressive, defensive, positional };
  }

  // 公開方法：遊戲結束後學習
  learnFromGameEnd(playerWon: boolean): void {
    this.gameMemory.gameCount++;

    if (playerWon) {
      // 玩家獲勝，AI需要調整策略
      console.log('🤖 AI從失敗中學習...');
    } else {
      console.log('🤖 AI記錄勝利經驗...');
    }

    // 根據遊戲經驗微調AI個性
    this.adjustAIPersonality();
    this.saveGameMemory();
  }

  private adjustAIPersonality(): void {
    // 根據玩家偏好調整AI策略
    const playerStyle = this.gameMemory.playerPreferences;

    // 如果玩家偏攻擊，AI變得更謹慎
    if (playerStyle.aggressive > 0.6) {
      this.AI_PERSONALITY.CAUTIOUS = Math.min(0.8, this.AI_PERSONALITY.CAUTIOUS + 0.1);
    }

    // 如果玩家偏防守，AI變得更攻擊
    if (playerStyle.defensive > 0.6) {
      this.AI_PERSONALITY.AGGRESSIVE = Math.min(0.9, this.AI_PERSONALITY.AGGRESSIVE + 0.1);
    }

    console.log('🤖 AI根據玩家風格調整了策略', {
      player: playerStyle,
      aiPersonality: this.AI_PERSONALITY
    });
  }
}
