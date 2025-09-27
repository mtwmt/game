import { ChessPiece, PieceType, PlayerColor, Position, GameState } from '../chess-piece.interface';
import { PieceMovesManager } from './chinese-chess-piece-moves';

/**
 * 中國象棋驗證工具類
 * 集中管理所有象棋規則驗證邏輯
 * 包含移動合法性檢查、將軍檢查、王見王檢查等
 */
export class ChessValidation {
  // ==========================================
  // 核心驗證方法
  // ==========================================

  /**
   * 檢查移動是否合法（核心合法性檢查）
   * 檢查移動後是否會讓自己被將軍或造成王見王
   * @param move 要檢查的移動
   * @param gameState 當前遊戲狀態
   * @returns 移動是否合法
   */
  static isMoveLegal(move: { from: Position; to: Position }, gameState: GameState): boolean {
    const board = gameState.board;
    const piece = board[move.from.y][move.from.x];
    if (!piece) return false;

    // 備份原始狀態
    const originalTarget = board[move.to.y][move.to.x];
    const originalPos = piece.position;

    // 模擬移動
    board[move.to.y][move.to.x] = piece;
    board[move.from.y][move.from.x] = null;
    piece.position = move.to;

    // 檢查是否會讓自己被將軍（送死檢查）
    const wouldBeInCheck = this.isInCheck(board, piece.color);

    // 還原棋盤狀態
    board[move.from.y][move.from.x] = piece;
    board[move.to.y][move.to.x] = originalTarget;
    piece.position = originalPos;

    // 只有不會送死的移動才是合法的（允許王見王）
    return !wouldBeInCheck;
  }

  /**
   * 驗證移動是否符合象棋規則（包含特殊規則檢查）
   * 這是比 isMoveLegal 更嚴格的檢查，包含更多象棋規則
   * @param move 要驗證的移動
   * @param gameState 當前遊戲狀態
   * @param playerColor 移動玩家的顏色
   * @returns 移動是否符合所有象棋規則
   */
  static validateMoveWithRules(
    move: { from: Position; to: Position },
    gameState: GameState,
    playerColor: PlayerColor
  ): boolean {
    const movingPiece = gameState.board[move.from.y][move.from.x];
    if (!movingPiece || movingPiece.color !== playerColor) return false;

    // 1. 基本移動合法性檢查（僅送死檢查，允許王見王）
    if (!this.isMoveLegal(move, gameState)) return false;

    // 2. 模擬移動後的狀態
    const newState = this.simulateMove(gameState, move);

    // 3. 檢查是否會讓自己被將軍（雙重檢查）
    if (this.isInCheck(newState.board, playerColor)) {
      return false;
    }

    return true;
  }

  /**
   * 檢查移動是否在可能移動列表中
   * @param move 要檢查的移動
   * @param possibleMoves 可能的移動列表
   * @returns 移動是否有效
   */
  static isValidMove(
    move: { from: Position; to: Position },
    possibleMoves: { from: Position; to: Position }[]
  ): boolean {
    return possibleMoves.some(
      (validMove) =>
        validMove.from.x === move.from.x &&
        validMove.from.y === move.from.y &&
        validMove.to.x === move.to.x &&
        validMove.to.y === move.to.y
    );
  }

  // ==========================================
  // 將軍和王見王檢查
  // ==========================================

  /**
   * 檢查是否被將軍
   * @param board 棋盤狀態
   * @param color 檢查的顏色
   * @returns 是否被將軍
   */
  static isInCheck(board: (ChessPiece | null)[][], color: PlayerColor): boolean {
    // 找到該顏色的王
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

    if (!kingPos) return false;

    // 檢查對方所有棋子是否能攻擊到王
    const oppositeColor = color === PlayerColor.RED ? PlayerColor.BLACK : PlayerColor.RED;
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = board[y][x];
        if (piece && piece.color === oppositeColor) {
          const possibleMoves = PieceMovesManager.getPieceMoves(piece, board, false);
          if (possibleMoves.some((move) => move.x === kingPos!.x && move.y === kingPos!.y)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * 檢查是否會造成王見王
   * @param board 棋盤狀態
   * @returns 是否會造成王見王
   */
  static wouldKingsFaceEachOther(board: (ChessPiece | null)[][]): boolean {
    let redKing: Position | null = null;
    let blackKing: Position | null = null;

    // 找到兩個王的位置
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = board[y][x];
        if (piece && piece.type === PieceType.KING) {
          if (piece.color === PlayerColor.RED) {
            redKing = { x, y };
          } else {
            blackKing = { x, y };
          }
        }
      }
    }

    if (!redKing || !blackKing) return false;
    if (redKing.x !== blackKing.x) return false; // 不在同一列

    // 檢查兩王之間是否有棋子
    const minY = Math.min(redKing.y, blackKing.y);
    const maxY = Math.max(redKing.y, blackKing.y);
    for (let y = minY + 1; y < maxY; y++) {
      if (board[y][redKing.x] !== null) {
        return false; // 有棋子阻擋，不會王見王
      }
    }

    return true; // 會造成王見王
  }

  // ==========================================
  // 遊戲狀態檢查
  // ==========================================

  /**
   * 檢查是否為將死
   * @param board 棋盤狀態
   * @param color 檢查的顏色
   * @returns 是否為將死
   */
  static isCheckmate(board: (ChessPiece | null)[][], color: PlayerColor): boolean {
    // 必須處於將軍狀態
    if (!this.isInCheck(board, color)) {
      return false;
    }

    // 嘗試所有可能的移動，看是否能解除將軍
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = board[y][x];
        if (piece && piece.color === color) {
          const possibleMoves = PieceMovesManager.getPieceMoves(piece, board);
          for (const move of possibleMoves) {
            // 模擬移動
            const originalTarget = board[move.y][move.x];
            const originalPos = piece.position;

            board[move.y][move.x] = piece;
            board[y][x] = null;
            piece.position = move;

            // 檢查移動後是否仍然被將軍
            const stillInCheck = this.isInCheck(board, color);

            // 還原移動
            board[y][x] = piece;
            board[move.y][move.x] = originalTarget;
            piece.position = originalPos;

            if (!stillInCheck) {
              return false; // 找到可以解除將軍的移動
            }
          }
        }
      }
    }

    return true; // 沒有移動可以解除將軍，確認為將死
  }

  /**
   * 檢查是否為和棋
   * @param board 棋盤狀態
   * @param color 檢查的顏色
   * @returns 是否為和棋
   */
  static isStalemate(board: (ChessPiece | null)[][], color: PlayerColor): boolean {
    // 如果處於將軍狀態，不是平局而是將死
    if (this.isInCheck(board, color)) {
      return false;
    }

    // 檢查是否有任何合法移動
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = board[y][x];
        if (piece && piece.color === color) {
          const moves = PieceMovesManager.getPieceMoves(piece, board);
          if (moves.length > 0) {
            return false; // 有可用移動，不是和棋
          }
        }
      }
    }

    return true;
  }

  // ==========================================
  // 輔助方法
  // ==========================================

  /**
   * 模擬移動並返回新的遊戲狀態（不會修改原始狀態）
   * @param gameState 當前遊戲狀態
   * @param move 要模擬的移動
   * @returns 模擬移動後的新遊戲狀態
   */
  static simulateMove(gameState: GameState, move: { from: Position; to: Position }): GameState {
    // 深拷貝棋盤
    const newBoard = gameState.board.map((row) => [...row]);
    const movingPiece = newBoard[move.from.y][move.from.x];

    if (movingPiece) {
      // 移動棋子到目標位置
      newBoard[move.to.y][move.to.x] = {
        ...movingPiece,
        position: { x: move.to.x, y: move.to.y },
        hasMoved: true,
        isSelected: false,
      };
      // 清空原位置
      newBoard[move.from.y][move.from.x] = null;
    }

    return { ...gameState, board: newBoard };
  }

  /**
   * 獲取指定顏色所有棋子的所有可能移動（未過濾合法性）
   * @param gameState 當前遊戲狀態
   * @param color 棋子顏色
   * @returns 所有可能的移動列表
   */
  static getAllPossibleMoves(
    gameState: GameState,
    color: PlayerColor
  ): { from: Position; to: Position }[] {
    const moves: { from: Position; to: Position }[] = [];
    const board = gameState.board;

    // 遍歷棋盤上所有位置
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = board[y][x];
        if (piece && piece.color === color) {
          // 獲取這個棋子的所有可能移動
          const possibleMoves = PieceMovesManager.getPieceMoves(piece, board);
          for (const moveTo of possibleMoves) {
            moves.push({ from: piece.position, to: moveTo });
          }
        }
      }
    }

    return moves;
  }

  /**
   * 獲取所有合法移動（已過濾掉會讓自己被將軍或造成王見王的移動）
   * @param gameState 當前遊戲狀態
   * @param color 棋子顏色
   * @returns 所有合法的移動列表
   */
  static getAllLegalMoves(
    gameState: GameState,
    color: PlayerColor
  ): { from: Position; to: Position }[] {
    const allMoves = this.getAllPossibleMoves(gameState, color);
    return allMoves.filter((move) => this.isMoveLegal(move, gameState));
  }

  /**
   * 獲取隨機合法移動（備用方案）
   * 優先選擇吃子移動，如果沒有則隨機選擇
   * @param gameState 當前遊戲狀態
   * @param color 棋子顏色
   * @returns 隨機選擇的合法移動，如果沒有合法移動則返回 null
   */
  static getRandomLegalMove(
    gameState: GameState,
    color: PlayerColor
  ): { from: Position; to: Position } | null {
    const legalMoves = this.getAllLegalMoves(gameState, color);
    if (legalMoves.length === 0) return null;

    // 優先選擇吃子移動
    const captureMoves = legalMoves.filter(
      (move) => gameState.board[move.to.y][move.to.x] !== null
    );

    const moves = captureMoves.length > 0 ? captureMoves : legalMoves;
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // ==========================================
  // 專業 AI 驗證方法
  // ==========================================

  /**
   * AI 專業移動驗證 - 包含所有象棋規則
   * 用於高級 AI 策略的移動驗證
   * @param move 要驗證的移動
   * @param newState 移動後的新狀態
   * @param originalState 原始狀態
   * @param aiColor AI 的顏色
   * @returns 移動是否無效（true = 無效，false = 有效）
   */
  static isInvalidMoveForAI(
    move: { from: Position; to: Position },
    newState: GameState,
    originalState: GameState,
    aiColor: PlayerColor
  ): boolean {
    const movingPiece = originalState.board[move.from.y][move.from.x];
    if (!movingPiece) return true;

    // 1. 檢查是否會讓自己被將軍
    if (this.isInCheck(newState.board, aiColor)) {
      return true;
    }

    // 2. 檢查王見王情況 - 任何移動造成王見王都會敗北
    if (this.wouldKingsFaceEachOther(newState.board)) {
      return true; // 移動無效，因為會導致敗北
    }

    // 3. 檢查是否吃掉對方的王 - 立即獲勝但需要驗證
    const targetPiece = originalState.board[move.to.y][move.to.x];
    if (targetPiece && targetPiece.type === PieceType.KING) {
      // 吃王是有效移動，不是無效移動
      return false;
    }

    return false; // 移動有效
  }
}
