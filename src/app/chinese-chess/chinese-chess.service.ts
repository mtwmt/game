import { Injectable, signal } from '@angular/core';
import {
  ChessPiece,
  PieceType,
  PlayerColor,
  Position,
  MoveResult,
  GameState,
} from './chinese-chess-piece.interface';
import { GAME_CONSTANTS } from './utils/chinese-chess-config';
import { PieceMovesManager } from './utils/chinese-chess-piece-moves';
import { LRUCache } from './utils/lru-cache';
import { BoardCache, BoardCacheUtils } from './board-cache.interface';
import { ChessValidation } from './utils/chinese-chess-validation';
import { BaseAIStrategy } from './strategies/base-strategy';


export const initialState: GameState = {
  board: [],
  currentPlayer: PlayerColor.RED,
  selectedPiece: null,
  validMoves: [],
  status: {
    gameOver: false,
    winner: null,
    isInCheck: false,
    isSelfInCheck: false,
    isCheckmate: false,
    isStalemate: false,
  },
  moveHistory: [],
  isVsAI: true,
  aiState: {
    isThinking: false,
    thinkingText: '',
  },
  hasApiKey: false,
};
@Injectable({
  providedIn: 'root',
})
export class ChineseChessService {

  // 統一的 API Key 狀態管理
  hasApiKey = signal(false);

  private boardCache: BoardCache = BoardCacheUtils.createEmptyCache();

  /**
   * 建構函數：初始化服務並更新 API Key 狀態
   */
  constructor() {
    this.updateApiKeyStatus();
  }

  private moveCache = new LRUCache<string, Position[]>();

  /**
   * 驗證棋盤位置是否在有效範圍內
   * @param x X 座標 (0-8)
   * @param y Y 座標 (0-9)
   * @param context 錯誤訊息的上下文
   * @throws Error 如果位置無效
   */
  private validatePosition(x: number, y: number, context: string = 'position'): void {
    if (!this.isValidPosition(x, y)) {
      throw new Error(`Invalid chess ${context}: (${x}, ${y}). Valid range: x[0-8], y[0-9]`);
    }
  }

  /**
   * 驗證棋盤結構是否正確 (9x10)
   * @param board 要驗證的棋盤
   * @throws Error 如果棋盤結構無效
   */
  private validateBoard(board: (ChessPiece | null)[][]): void {
    if (!board || board.length !== GAME_CONSTANTS.BOARD_HEIGHT) {
      throw new Error(`Invalid board height: expected ${GAME_CONSTANTS.BOARD_HEIGHT}`);
    }
    for (let y = 0; y < board.length; y++) {
      if (!board[y] || board[y].length !== GAME_CONSTANTS.BOARD_WIDTH) {
        throw new Error(
          `Invalid board width at row ${y}: expected ${GAME_CONSTANTS.BOARD_WIDTH}`
        );
      }
    }
  }

  /**
   * 初始化象棋棋盤
   * 創建 9x10 的棋盤並放置初始棋子
   * @returns 初始化後的棋盤
   */
  initializeBoard(): (ChessPiece | null)[][] {
    const board: (ChessPiece | null)[][] = Array(GAME_CONSTANTS.BOARD_HEIGHT)
      .fill(null)
      .map(() => Array(GAME_CONSTANTS.BOARD_WIDTH).fill(null));

    this.setupInitialPieces(board);
    return board;
  }

  /**
   * 在棋盤上設置初始棋子位置
   * 包含紅黑雙方的所有棋子：將帥、士仕、象相、馬、車、砲、兵卒
   * @param board 要設置棋子的棋盤
   */
  private setupInitialPieces(board: (ChessPiece | null)[][]): void {
    // 紅方後排
    const redBackRow: PieceType[] = [
      PieceType.ROOK,
      PieceType.HORSE,
      PieceType.ELEPHANT,
      PieceType.ADVISOR,
      PieceType.KING,
      PieceType.ADVISOR,
      PieceType.ELEPHANT,
      PieceType.HORSE,
      PieceType.ROOK,
    ];
    redBackRow.forEach((type, x) => {
      const id = this.generatePieceId(type, PlayerColor.RED, x);
      board[9][x] = this.createPiece(id, type, PlayerColor.RED, x, 9);
    });

    // 黑方後排
    const blackBackRow: PieceType[] = [...redBackRow];
    blackBackRow.forEach((type, x) => {
      const id = this.generatePieceId(type, PlayerColor.BLACK, x);
      board[0][x] = this.createPiece(id, type, PlayerColor.BLACK, x, 0);
    });

    // 砲
    [1, 7].forEach((x, index) => {
      board[7][x] = this.createPiece(
        `r-cannon-${index + 1}`,
        PieceType.CANNON,
        PlayerColor.RED,
        x,
        7
      );
      board[2][x] = this.createPiece(
        `b-cannon-${index + 1}`,
        PieceType.CANNON,
        PlayerColor.BLACK,
        x,
        2
      );
    });

    // 兵/卒
    for (let x = 0; x < 9; x += 2) {
      board[6][x] = this.createPiece(`r-soldier-${x}`, PieceType.SOLDIER, PlayerColor.RED, x, 6);
      board[3][x] = this.createPiece(`b-soldier-${x}`, PieceType.SOLDIER, PlayerColor.BLACK, x, 3);
    }
  }

  private generatePieceId(type: PieceType, color: PlayerColor, position: number): string {
    const prefix = color === PlayerColor.RED ? 'r' : 'b';
    if (type === PieceType.KING) return `${prefix}-king`;
    return `${prefix}-${type}-${position < 4 ? '1' : '2'}`;
  }

  private createPiece(
    id: string,
    type: PieceType,
    color: PlayerColor,
    x: number,
    y: number
  ): ChessPiece {
    return {
      id,
      type,
      color,
      position: { x, y },
      isSelected: false,
      hasMoved: false,
    };
  }

  /**
   * 初始化完整的遊戲狀態
   * 包含棋盤、玩家、遊戲狀態、API Key 等所有初始設定
   * @returns 初始化的遊戲狀態
   */
  initializeGameState(): GameState {
    return {
      ...initialState,
      board: this.initializeBoard(),
      hasApiKey: this.checkHasApiKey(),
    };
  }

  /**
   * 檢查座標是否在棋盤有效範圍內
   * @param x X 座標 (應該在 0-8 之間)
   * @param y Y 座標 (應該在 0-9 之間)
   * @returns 位置是否有效
   */
  isValidPosition(x: number, y: number): boolean {
    return (
      x >= 0 && x < GAME_CONSTANTS.BOARD_WIDTH && y >= 0 && y < GAME_CONSTANTS.BOARD_HEIGHT
    );
  }

  /**
   * 檢查指定位置是否在對應顏色的宮殿內
   * 宮殿是將帥活動的限制區域 (3x3)
   * @param x X 座標
   * @param y Y 座標
   * @param color 棋子顏色
   * @returns 是否在宮殿內
   */
  isInPalace(x: number, y: number, color: PlayerColor): boolean {
    if (color === PlayerColor.RED) {
      return (
        x >= GAME_CONSTANTS.PALACE_LEFT &&
        x <= GAME_CONSTANTS.PALACE_RIGHT &&
        y >= GAME_CONSTANTS.RED_PALACE_TOP &&
        y <= GAME_CONSTANTS.RED_PALACE_BOTTOM
      );
    } else {
      return (
        x >= GAME_CONSTANTS.PALACE_LEFT &&
        x <= GAME_CONSTANTS.PALACE_RIGHT &&
        y >= GAME_CONSTANTS.BLACK_PALACE_TOP &&
        y <= GAME_CONSTANTS.BLACK_PALACE_BOTTOM
      );
    }
  }

  /**
   * 檢查指定 Y 座標是否在該顏色的本方陣地
   * 用於限制象和兵的移動範圍
   * @param y Y 座標
   * @param color 棋子顏色
   * @returns 是否在本方陣地
   */
  isOnOwnSide(y: number, color: PlayerColor): boolean {
    if (color === PlayerColor.RED) {
      return y >= 5;
    } else {
      return y <= 4;
    }
  }

  /**
   * 檢查兩王是否會直接面對面（王見王情況）
   * 這是象棋中的重要規則：造成王見王的一方敗北
   * @param board 棋盤狀態
   * @param moveCount 移動計數（用於快取）
   * @returns 是否會發生王見王
   */
  wouldKingsFaceEachOther(board: (ChessPiece | null)[][], moveCount: number = 0): boolean {
    this.updateBoardCache(board, moveCount);

    const redKing = this.boardCache.kingPositions.get(PlayerColor.RED);
    const blackKing = this.boardCache.kingPositions.get(PlayerColor.BLACK);

    if (!redKing || !blackKing) return false;
    if (redKing.x !== blackKing.x) return false; // 不在同一列

    // 確保兩王都在同一列且在棋盤上
    if (!this.isValidPosition(redKing.x, redKing.y) || !this.isValidPosition(blackKing.x, blackKing.y)) {
      return false;
    }

    // 檢查兩王之間是否沒有棋子阻擋
    return this.isPathClear(board, redKing, blackKing);
  }

  /**
   * 檢查兩個位置之間的路徑是否暢通（沒有棋子阻擋）
   * 主要用於王見王檢查，檢查兩王之間是否有棋子
   * @param board 棋盤狀態
   * @param from 起始位置
   * @param to 目標位置
   * @returns 路徑是否暢通
   */
  private isPathClear(board: (ChessPiece | null)[][], from: Position, to: Position): boolean {
    const minY = Math.min(from.y, to.y);
    const maxY = Math.max(from.y, to.y);

    // 檢查兩點之間是否有棋子阻擋
    for (let y = minY + 1; y < maxY; y++) {
      if (board[y][from.x] !== null) {
        return false; // 有棋子阻擋
      }
    }

    return true; // 路徑暢通
  }

  /**
   * 更新棋盤快取資訊
   * 快取王的位置和各顏色棋子列表以提升性能
   * @param board 棋盤狀態
   * @param moveCount 移動計數（用於判斷是否需要更新快取）
   */
  private updateBoardCache(board: (ChessPiece | null)[][], moveCount: number): void {
    if (!BoardCacheUtils.needsUpdate(this.boardCache, moveCount)) return;

    BoardCacheUtils.resetCache(this.boardCache);

    for (let y = 0; y < GAME_CONSTANTS.BOARD_HEIGHT; y++) {
      for (let x = 0; x < GAME_CONSTANTS.BOARD_WIDTH; x++) {
        const piece = board[y][x];
        if (piece) {
          this.boardCache.piecesByColor.get(piece.color)!.push(piece);
          if (piece.type === PieceType.KING) {
            this.boardCache.kingPositions.set(piece.color, { x, y });
          }
        }
      }
    }

    this.boardCache.lastMoveCount = moveCount;
  }

  /**
   * 清除所有快取
   * 在棋盤狀態改變時呼叫以確保快取一致性
   */
  private clearCaches(): void {
    this.moveCache.clear();
    BoardCacheUtils.resetCache(this.boardCache);
  }

  /**
   * 生成棋盤狀態的雜湊值
   * 用於快取識別和棋局重複檢測
   * @param board 棋盤狀態
   * @returns 棋盤的雜湊字串
   */
  private getBoardHash(board: (ChessPiece | null)[][]): string {
    let hash = '';
    for (let y = 0; y < GAME_CONSTANTS.BOARD_HEIGHT; y++) {
      for (let x = 0; x < GAME_CONSTANTS.BOARD_WIDTH; x++) {
        const piece = board[y][x];
        hash += piece ? `${piece.type}${piece.color}${x}${y}` : 'e';
      }
    }
    return hash;
  }


  /**
   * 獲取棋子的所有可能移動位置（已快取）
   * 包含王見王檢查，用於正常遊戲移動
   * @param piece 要分析的棋子
   * @param board 棋盤狀態
   * @returns 所有可能的移動位置
   * @throws Error 如果棋子為 null 或棋盤無效
   */
  getPossibleMoves(piece: ChessPiece, board: (ChessPiece | null)[][]): Position[] {
    if (!piece) {
      throw new Error('Cannot get possible moves for null piece');
    }
    this.validateBoard(board);
    this.validatePosition(piece.position.x, piece.position.y, 'piece position');

    // 改進的快取策略：包含棋子移動狀態
    const cacheKey = `${piece.id}-${piece.position.x}-${piece.position.y}-${piece.hasMoved}-true`;

    if (this.moveCache.has(cacheKey)) {
      return this.moveCache.get(cacheKey)!;
    }

    const moves = this.calculatePieceMoves(piece, board, true);
    this.moveCache.set(cacheKey, moves);
    return moves;
  }

  /**
   * 獲取棋子用於將軍檢查的可能移動位置（已快取）
   * 不包含王見王檢查，專用於將軍狀態檢測
   * @param piece 要分析的棋子
   * @param board 棋盤狀態
   * @returns 所有可能的攻擊位置
   * @throws Error 如果棋子為 null 或棋盤無效
   */
  getPossibleMovesForCheck(piece: ChessPiece, board: (ChessPiece | null)[][]): Position[] {
    if (!piece) {
      throw new Error('Cannot get possible moves for null piece');
    }
    this.validateBoard(board);
    this.validatePosition(piece.position.x, piece.position.y, 'piece position');

    // 改進的快取策略：包含棋子移動狀態
    const cacheKey = `${piece.id}-${piece.position.x}-${piece.position.y}-${piece.hasMoved}-false`;

    if (this.moveCache.has(cacheKey)) {
      return this.moveCache.get(cacheKey)!;
    }

    const moves = this.calculatePieceMoves(piece, board, false);
    this.moveCache.set(cacheKey, moves);
    return moves;
  }

  /**
   * 根據棋子類型計算其可能移動
   * 核心移動邏輯分發器，委託給 PieceMovesManager
   * @param piece 要分析的棋子
   * @param board 棋盤狀態
   * @param checkKingFacing 是否檢查王見王（將軍檢查時為 false）
   * @returns 該棋子的所有可能移動
   */
  private calculatePieceMoves(
    piece: ChessPiece,
    board: (ChessPiece | null)[][],
    checkKingFacing: boolean
  ): Position[] {
    return PieceMovesManager.getPieceMoves(
      piece,
      board,
      checkKingFacing,
      checkKingFacing ? this.wouldMoveCreateKingFacing.bind(this) : undefined
    );
  }


  /**
   * 檢查移動是否會造成王見王情況
   * 模擬移動並檢查是否導致兩王直接面對面
   * @param piece 要移動的棋子
   * @param move 目標位置
   * @param board 棋盤狀態
   * @returns 是否會造成王見王
   */
  private wouldMoveCreateKingFacing(
    piece: ChessPiece,
    move: Position,
    board: (ChessPiece | null)[][]
  ): boolean {
    const originalPiece = board[move.y][move.x];
    const originalPos = piece.position;

    // 模擬移動
    board[move.y][move.x] = piece;
    board[originalPos.y][originalPos.x] = null;
    piece.position = move;

    const result = this.wouldKingsFaceEachOther(board);

    // 還原棋盤
    board[originalPos.y][originalPos.x] = piece;
    board[move.y][move.x] = originalPiece;
    piece.position = originalPos;

    return result;
  }


  /**
   * 檢查指定顏色的王是否處於被將軍狀態
   * 通過檢查敵方棋子是否能攻擊到王的位置來判斷
   * @param board 棋盤狀態
   * @param color 要檢查的王的顏色
   * @param moveCount 移動計數（用於快取）
   * @returns 是否處於被將軍狀態
   */
  isInCheck(board: (ChessPiece | null)[][], color: PlayerColor, moveCount: number = 0): boolean {
    return ChessValidation.isInCheck(board, color);
  }

  /**
   * 執行棋子移動並驗證合法性
   * 這是遊戲邏輯的核心方法，處理移動驗證、執行和勝負判斷
   * @param gameState 當前遊戲狀態
   * @param from 起始位置
   * @param to 目標位置
   * @returns 移動結果，包含成功狀態和遊戲狀態
   */
  makeMove(gameState: GameState, from: Position, to: Position): MoveResult {
    this.validatePosition(from.x, from.y, 'source position');
    this.validatePosition(to.x, to.y, 'target position');
    this.validateBoard(gameState.board);

    const { board, moveHistory } = gameState;
    const piece = board[from.y][from.x];

    if (!piece) {
      return {
        success: false,
        status: {
          gameOver: false,
          winner: null,
          isInCheck: false,
          isSelfInCheck: false,
          isCheckmate: false,
          isStalemate: false,
        },
      };
    }

    const targetPiece = board[to.y][to.x];
    const moveCount = moveHistory.length;

    // 清除快取因為棋盤即將改變
    this.clearCaches();

    // 執行移動
    board[to.y][to.x] = piece;
    board[from.y][from.x] = null;
    piece.position = to;

    // 檢查是否吃掉對方的王 - 遊戲結束
    if (targetPiece && targetPiece.type === PieceType.KING) {
      piece.hasMoved = true;
      return {
        success: true,
        captured: targetPiece,
        status: {
          gameOver: true,
          winner: piece.color,
          winReason: '吃掉對方的王',
          isInCheck: false,
          isSelfInCheck: false,
          isCheckmate: true,
          isStalemate: false,
        },
      };
    }

    // 檢查是否造成王見王 - 造成王見王的一方敗北
    if (this.wouldKingsFaceEachOther(board, moveCount + 1)) {
      piece.hasMoved = true;
      console.log(`🔴 王見王！${piece.color === PlayerColor.RED ? '紅方' : '黑方'} 敗北！`);
      return {
        success: true,
        captured: targetPiece || undefined,
        status: {
          gameOver: true,
          winner: piece.color === PlayerColor.RED ? PlayerColor.BLACK : PlayerColor.RED, // 對方獲勝
          winReason: '對方造成王見王',
          isInCheck: false,
          isSelfInCheck: false,
          isCheckmate: true, // 視為將死
          isStalemate: false,
        },
      };
    }

    // 信任 XQWLight 的判斷，只計算遊戲狀態用於顯示
    const oppositeColor = piece.color === PlayerColor.RED ? PlayerColor.BLACK : PlayerColor.RED;
    const isCheck = this.isInCheck(board, oppositeColor, moveCount + 1);
    const isSelfInCheck = this.isInCheck(board, piece.color, moveCount + 1);

    piece.hasMoved = true;

    // 遊戲結束條件檢查（僅用於狀態顯示）
    const isCheckmate = isCheck ? this.isCheckmate(board, oppositeColor, moveCount + 1) : false;
    const isStalemate = !isCheck ? this.isStalemate(board, oppositeColor, moveCount + 1) : false;

    return {
      success: true,
      captured: targetPiece || undefined,
      status: {
        gameOver: isCheckmate || isStalemate,
        winner: isCheckmate ? piece.color : null,
        winReason: isCheckmate ? '將死對方' : isStalemate ? '和棋' : undefined,
        isInCheck: isCheck,
        isSelfInCheck: isSelfInCheck,
        isCheckmate,
        isStalemate,
      },
    };
  }

  /**
   * 獲取棋子的中文符號表示
   * 根據棋子類型和顏色返回對應的中文字符
   * @param piece 棋子
   * @returns 棋子的中文符號
   */
  getPieceSymbol(piece: ChessPiece): string {
    const symbols: Record<PieceType, { red: string; black: string }> = {
      [PieceType.KING]: { red: '帥', black: '將' },
      [PieceType.ADVISOR]: { red: '仕', black: '士' },
      [PieceType.ELEPHANT]: { red: '相', black: '象' },
      [PieceType.HORSE]: { red: '馬', black: '馬' },
      [PieceType.ROOK]: { red: '車', black: '車' },
      [PieceType.CANNON]: { red: '炮', black: '砲' },
      [PieceType.SOLDIER]: { red: '兵', black: '卒' },
    };

    return symbols[piece.type][piece.color];
  }

  /**
   * 檢查是否存在有效的 Gemini API Key
   * 從 localStorage 讀取並驗證 API Key
   * @returns 是否有有效的 API Key
   */
  checkHasApiKey(): boolean {
    if (typeof localStorage !== 'undefined') {
      const apiKey = localStorage.getItem('gemini-api-key');
      return !!apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE';
    }
    return false;
  }

  /**
   * 更新 API Key 狀態信號
   * 檢查並更新內部 API Key 狀態
   */
  updateApiKeyStatus(): void {
    const hasKey = this.checkHasApiKey();
    this.hasApiKey.set(hasKey);
  }

  /**
   * 檢查是否為平局（無子可動）
   * 當玩家不處於將軍狀態但無任何合法移動時為平局
   * @param board 棋盤狀態
   * @param color 要檢查的玩家顏色
   * @param moveCount 移動計數
   * @returns 是否為平局
   */
  isStalemate(board: (ChessPiece | null)[][], color: PlayerColor, moveCount: number = 0): boolean {
    return ChessValidation.isStalemate(board, color);
  }

  /**
   * 檢查是否為將死
   * 當玩家處於將軍狀態且無任何合法移動能解除將軍時為將死
   * @param board 棋盤狀態
   * @param color 要檢查的玩家顏色
   * @param moveCount 移動計數
   * @returns 是否為將死
   */
  isCheckmate(board: (ChessPiece | null)[][], color: PlayerColor, moveCount: number = 0): boolean {
    return ChessValidation.isCheckmate(board, color);
  }

  /**
   * 檢查長將（連續將軍）規則
   * 檢測是否存在重複的將軍模式，用於判斷禁止長將
   * @param moveHistory 移動歷史記錄
   * @param maxRepeats 最大重複次數（預設 3 次）
   * @returns 是否構成長將
   */
  isPerpetualCheck(moveHistory: string[], maxRepeats: number = 3): boolean {
    if (moveHistory.length < maxRepeats * 2) {
      return false;
    }

    const recentMoves = moveHistory.slice(-maxRepeats * 2);
    const pattern = recentMoves.slice(0, 2);

    // 檢查是否重複相同的兩步移動
    for (let i = 2; i < recentMoves.length; i += 2) {
      if (recentMoves[i] !== pattern[0] || recentMoves[i + 1] !== pattern[1]) {
        return false;
      }
    }

    return true;
  }

  // ==========================================
  // 通用象棋邏輯方法 (委託給 ChessValidation)
  // ==========================================

  /**
   * 獲取指定顏色所有棋子的所有可能移動（委託給 ChessValidation）
   */
  getAllPossibleMoves(gameState: GameState, color: PlayerColor): { from: Position; to: Position }[] {
    return ChessValidation.getAllPossibleMoves(gameState, color);
  }

  /**
   * 獲取所有合法移動（委託給 ChessValidation）
   */
  getAllLegalMoves(gameState: GameState, color: PlayerColor): { from: Position; to: Position }[] {
    return ChessValidation.getAllLegalMoves(gameState, color);
  }

  /**
   * 檢查移動是否合法（委託給 ChessValidation）
   */
  isMoveLegal(move: { from: Position; to: Position }, gameState: GameState): boolean {
    return ChessValidation.isMoveLegal(move, gameState);
  }

  /**
   * 模擬移動並返回新的遊戲狀態（委託給 ChessValidation）
   */
  simulateMove(gameState: GameState, move: { from: Position; to: Position }): GameState {
    return ChessValidation.simulateMove(gameState, move);
  }

  /**
   * 驗證移動是否符合象棋規則（委託給 ChessValidation）
   */
  validateMoveWithRules(
    move: { from: Position; to: Position },
    gameState: GameState,
    playerColor: PlayerColor
  ): boolean {
    return ChessValidation.validateMoveWithRules(move, gameState, playerColor);
  }

  /**
   * 獲取隨機合法移動（委託給 ChessValidation）
   */
  getRandomLegalMove(gameState: GameState, color: PlayerColor): { from: Position; to: Position } | null {
    return ChessValidation.getRandomLegalMove(gameState, color);
  }

  /**
   * 檢查移動是否在可能移動列表中（委託給 ChessValidation）
   */
  isValidMove(
    move: { from: Position; to: Position },
    possibleMoves: { from: Position; to: Position }[]
  ): boolean {
    return ChessValidation.isValidMove(move, possibleMoves);
  }

  // ==========================================
  // AI 整合邏輯 (統一入口)
  // ==========================================

  /**
   * 執行 AI 移動 - 統一的 AI 移動入口
   * 1. 調用 AI 策略獲取移動決策
   * 2. 驗證 AI 返回的移動是否合法
   * 3. 如果合法則執行移動，否則使用備用策略
   * @param gameState 當前遊戲狀態
   * @param strategy AI 策略實例
   * @returns 移動結果
   */
  async makeAIMove(
    gameState: GameState,
    strategy: BaseAIStrategy
  ): Promise<MoveResult> {
    try {
      // 1. 檢查 AI 策略是否可用
      const isAvailable = await strategy.isAvailable();
      if (!isAvailable) {
        return this.handleAIMoveFallback(gameState, 'AI 策略不可用');
      }

      // 2. 調用 AI 策略獲取移動決策
      const aiResult = await strategy.makeMove(gameState);
      if (!aiResult) {
        return this.handleAIMoveFallback(gameState, 'AI 策略未返回有效移動');
      }

      // 3. 驗證 AI 返回的移動是否在合法移動列表中
      const { from, to } = aiResult;
      const piece = gameState.board[from.y][from.x];

      if (!piece) {
        return this.handleAIMoveFallback(gameState, `位置 (${from.x},${from.y}) 沒有棋子`);
      }

      if (piece.color !== PlayerColor.BLACK) {
        return this.handleAIMoveFallback(gameState, 'AI 嘗試移動非黑方棋子');
      }

      // 4. 檢查移動是否在該棋子的可能移動列表中
      const possibleMoves = this.getPossibleMoves(piece, gameState.board);
      if (!this.isValidMove({ from, to }, possibleMoves.map(pos => ({ from: piece.position, to: pos })))) {
        return this.handleAIMoveFallback(gameState, `移動 (${from.x},${from.y}) -> (${to.x},${to.y}) 不在可能移動列表中`);
      }

      // 5. 檢查移動是否合法（不會送死或王見王）
      if (!ChessValidation.isMoveLegal({ from, to }, gameState)) {
        return this.handleAIMoveFallback(gameState, `移動 (${from.x},${from.y}) -> (${to.x},${to.y}) 會導致送死或王見王`);
      }

      // 6. 執行合法的 AI 移動
      console.log(`✅ AI 移動驗證通過: (${from.x},${from.y}) -> (${to.x},${to.y})`);
      return this.makeMove(gameState, from, to);

    } catch (error) {
      console.error('❌ AI 移動執行失敗:', error);
      return this.handleAIMoveFallback(gameState, `AI 執行錯誤: ${error}`);
    }
  }

  /**
   * AI 移動失敗時的備用處理
   * 使用隨機合法移動作為備案
   * @param gameState 當前遊戲狀態
   * @param reason 失敗原因
   * @returns 移動結果
   */
  private handleAIMoveFallback(gameState: GameState, reason: string): MoveResult {
    console.warn(`⚠️ AI 移動失敗: ${reason}`);
    console.log('🎲 使用隨機合法移動作為備案...');

    // 獲取隨機合法移動
    const randomMove = ChessValidation.getRandomLegalMove(gameState, PlayerColor.BLACK);

    if (randomMove) {
      console.log(`🎯 備用移動: (${randomMove.from.x},${randomMove.from.y}) -> (${randomMove.to.x},${randomMove.to.y})`);
      return this.makeMove(gameState, randomMove.from, randomMove.to);
    } else {
      // 連隨機移動都沒有，遊戲可能結束了
      console.error('❌ 沒有可用的合法移動，AI 無法行動');
      return {
        success: false,
        captured: undefined,
        status: gameState.status,
      };
    }
  }

  /**
   * 將棋盤狀態轉換為 FEN 格式
   * FEN (Forsyth-Edwards Notation) 是象棋局面的標準表示法
   * @param gameState 當前遊戲狀態
   * @returns FEN 格式字串
   */
  convertToFEN(gameState: GameState): string {
    const board = gameState.board;
    const fenRows: string[] = [];

    // 轉換棋盤 (從上到下，從左到右)
    for (let y = 0; y < GAME_CONSTANTS.BOARD_HEIGHT; y++) {
      let row = '';
      let emptyCount = 0;

      for (let x = 0; x < GAME_CONSTANTS.BOARD_WIDTH; x++) {
        const piece = board[y][x];

        if (!piece) {
          emptyCount++;
        } else {
          // 先輸出累積的空格數
          if (emptyCount > 0) {
            row += emptyCount.toString();
            emptyCount = 0;
          }

          // 添加棋子符號
          row += this.pieceToFEN(piece);
        }
      }

      // 行末如果有空格，也要輸出
      if (emptyCount > 0) {
        row += emptyCount.toString();
      }

      fenRows.push(row);
    }

    // 組合 FEN: 棋盤 + 當前玩家 + 其他資訊
    const boardFEN = fenRows.join('/');
    const activeColor = gameState.currentPlayer === PlayerColor.RED ? 'w' : 'b';

    // 簡化版 FEN：棋盤 + 當前玩家
    // 完整 FEN 還包括：回合數、無吃子回合數等，這裡暫時省略
    return `${boardFEN} ${activeColor}`;
  }

  /**
   * 將棋子轉換為 FEN 符號
   * 紅方用大寫，黑方用小寫
   */
  private pieceToFEN(piece: ChessPiece): string {
    const fenMap: Record<PieceType, string> = {
      [PieceType.KING]: 'k',
      [PieceType.ADVISOR]: 'a',
      [PieceType.ELEPHANT]: 'b', // bishop
      [PieceType.HORSE]: 'n',    // knight
      [PieceType.ROOK]: 'r',
      [PieceType.CANNON]: 'c',
      [PieceType.SOLDIER]: 'p',  // 兵/卒
    };

    const char = fenMap[piece.type];
    return piece.color === PlayerColor.RED ? char.toUpperCase() : char.toLowerCase();
  }
}
