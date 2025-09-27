import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChessGameService, initialState } from './chess-game.service';
import { ChessAIService } from './chess-ai.service';
import {
  ChessPiece,
  PlayerColor,
  Position,
  GameState,
  MoveResult,
  GameStatus,
} from './chess-piece.interface';
import { GAME_CONSTANTS } from './utils/chinese-chess-values';

@Component({
  selector: 'app-chinese-chess',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './chinese-chess.html',
  styleUrl: './chinese-chess.scss',
})
export class ChineseChess implements OnInit, OnDestroy {
  private chessGameService = inject(ChessGameService);
  private chessAIService = inject(ChessAIService);
  private apiKeyUpdateListener?: () => void;
  private lastSelectedPiece: ChessPiece | null = null;

  protected gameState = signal<GameState>(initialState);
  protected aiType = signal<'local' | 'service'>('local');

  // 遊戲狀態相關
  protected board = computed(() => this.gameState().board); // 9x10 棋盤陣列，存放所有棋子位置
  protected currentPlayer = computed(() => this.gameState().currentPlayer); // 當前輪到的玩家 (紅方/黑方)
  protected selectedPiece = computed(() => this.gameState().selectedPiece); // 目前選中的棋子
  protected validMoves = computed(() => this.gameState().validMoves); // 選中棋子的有效移動位置
  protected moveHistory = computed(() => this.gameState().moveHistory); // 移動歷史記錄 (棋譜)

  // 遊戲結束狀態
  protected gameOver = computed(() => this.gameState().status.gameOver); // 遊戲是否結束
  protected winner = computed(() => this.gameState().status.winner); // 獲勝者 (紅方/黑方/null)

  // 將軍相關狀態
  protected isInCheck = computed(() => this.gameState().status.isInCheck); // 對方是否被將軍
  protected isCheckmate = computed(() => this.gameState().status.isCheckmate); // 是否將死
  protected isStalemate = computed(() => this.gameState().status.isStalemate); // 是否困斃/和棋
  protected isSelfInCheck = computed(() => this.gameState().status.isSelfInCheck); // 當前玩家是否被將軍

  // 顯示相關
  protected currentPlayerDisplay = computed(() =>
    this.currentPlayer() === PlayerColor.RED ? '紅方' : '黑方'
  ); // 當前玩家的中文顯示

  // AI 相關狀態
  protected isVsAI = computed(() => this.gameState().isVsAI); // 是否為人機對戰模式
  protected aiIsThinking = computed(() => this.gameState().aiState.isThinking); // AI 是否正在思考
  protected aiThinkingText = computed(() => this.gameState().aiState.thinkingText); // AI 思考狀態文字
  protected aiDifficulty = signal<'easy' | 'medium' | 'hard'>('medium'); // AI 難度設定

  // API Key Modal (保留以後可能用到)
  protected hasApiKey = computed(() => this.chessGameService.hasApiKey()); // 是否有 Gemini API Key
  protected isGeminiEnabled = computed(() => this.hasApiKey() && this.isVsAI()); // 是否啟用 Gemini AI
  protected isApiKeyModalOpen = signal(false); // API Key 設定彈窗是否開啟

  // 互動控制
  protected isAITurn = computed(
    () => this.isVsAI() && this.currentPlayer() === PlayerColor.BLACK && !this.gameOver()
  ); // 是否輪到 AI 下棋

  protected canInteract = computed(
    () => !this.isVsAI() || this.currentPlayer() === PlayerColor.RED
  ); // 玩家是否可以點擊棋盤 (非 AI 回合)

  protected readonly PlayerColor = PlayerColor;
  protected readonly Math = Math;

  /**
   * Angular 生命週期：元件初始化
   * 初始化遊戲狀態、設定 AI 引擎、設置事件監聽器
   */
  ngOnInit(): void {
    this.resetGame();
    this.chessGameService.updateApiKeyStatus();

    // 初始化為 XQWLight 引擎
    this.chessAIService.setAIMode('xqwlight-only');

    // 恢復事件監聽器 - 保留以後可能用到
    if (typeof window !== 'undefined') {
      this.apiKeyUpdateListener = () => {
        this.chessGameService.updateApiKeyStatus();
        // 當 API key 狀態改變時，重新檢查 AI 類型
        if (this.hasApiKey() && this.aiType() === 'local') {
          this.setAIType('service');
        }
      };
      window.addEventListener('gemini_api_key_updated', this.apiKeyUpdateListener);
    }
  }

  /**
   * Angular 生命週期：元件銷毀
   * 清理事件監聽器，防止記憶體洩漏
   */
  ngOnDestroy(): void {
    if (typeof window !== 'undefined' && this.apiKeyUpdateListener) {
      window.removeEventListener('gemini_api_key_updated', this.apiKeyUpdateListener);
    }
  }

  /**
   * 重置遊戲到初始狀態
   * 重新初始化棋盤、棋子位置和遊戲狀態
   */
  resetGame(): void {
    const newGameState = this.chessGameService.initializeGameState();
    this.gameState.set(newGameState);
  }

  /**
   * 處理棋盤方格點擊事件
   * 根據當前狀態決定是選擇棋子還是執行移動
   * @param x 點擊位置的 x 座標 (0-8)
   * @param y 點擊位置的 y 座標 (0-9)
   */
  onSquareClick(x: number, y: number): void {
    if (this.gameOver() || !this.canInteract()) return;

    const currentState = this.gameState();
    const piece = currentState.board[y][x];

    if (currentState.selectedPiece) {
      this.handleSelectedPieceClick(x, y, piece, currentState);
    } else {
      this.handleInitialPieceClick(piece);
    }
  }

  /**
   * 處理已有棋子被選中時的點擊事件
   * @param x 點擊位置的 x 座標
   * @param y 點擊位置的 y 座標
   * @param piece 點擊位置的棋子（可能為 null）
   * @param currentState 當前遊戲狀態
   */
  private handleSelectedPieceClick(
    x: number,
    y: number,
    piece: ChessPiece | null,
    currentState: GameState
  ): void {
    if (
      piece &&
      piece.color === currentState.currentPlayer &&
      piece !== currentState.selectedPiece
    ) {
      // 選擇新的己方棋子
      this.selectPiece(piece);
    } else if (this.isValidMove(x, y)) {
      // 移動棋子到有效位置
      this.makeMove(currentState.selectedPiece!.position, { x, y });
    } else {
      // 點擊無效位置，取消選擇
      this.deselectPiece();
    }
  }

  /**
   * 處理初始狀態（無棋子被選中）時的點擊事件
   * @param piece 點擊位置的棋子（可能為 null）
   */
  private handleInitialPieceClick(piece: ChessPiece | null): void {
    const currentState = this.gameState();
    if (piece && piece.color === currentState.currentPlayer) {
      // 選擇己方棋子
      this.selectPiece(piece);
    }
  }

  /**
   * 選擇棋子並計算其可行移動
   * @param piece 要選擇的棋子
   */
  private selectPiece(piece: ChessPiece): void {
    const currentState = this.gameState();

    // 優化：僅清除上次選中的棋子，O(1) 而不是 O(90)
    if (this.lastSelectedPiece) {
      this.lastSelectedPiece.isSelected = false;
    }

    // 設定新選擇並計算可行移動
    piece.isSelected = true;
    this.lastSelectedPiece = piece;
    const validMoves = this.chessGameService.getPossibleMoves(piece, currentState.board);

    this.gameState.set({
      ...currentState,
      selectedPiece: piece,
      validMoves,
    });
  }

  /**
   * 取消選擇當前棋子
   * 清除選擇狀態和可行移動列表
   */
  private deselectPiece(): void {
    const currentState = this.gameState();

    // 優化：使用追蹤的棋子引用
    if (this.lastSelectedPiece) {
      this.lastSelectedPiece.isSelected = false;
      this.lastSelectedPiece = null;
    }

    this.gameState.set({
      ...currentState,
      selectedPiece: null,
      validMoves: [],
    });
  }

  /**
   * 檢查指定座標是否為當前選中棋子的有效移動位置
   * @param x 目標位置的 x 座標
   * @param y 目標位置的 y 座標
   * @returns 是否為有效移動位置
   */
  protected isValidMove(x: number, y: number): boolean {
    return this.validMoves().some((move) => move.x === x && move.y === y);
  }

  /**
   * 執行棋子移動
   * 調用遊戲服務進行移動驗證和執行，然後處理移動結果
   * @param from 起始位置
   * @param to 目標位置
   */
  private makeMove(from: Position, to: Position): void {
    const currentState = this.gameState();
    const piece = currentState.board[from.y][from.x];
    if (!piece) return;

    const result: MoveResult = this.chessGameService.makeMove(currentState, from, to);

    if (result.success) {
      this.processMoveResult(result, piece, from, to, currentState);
    }
  }

  /**
   * 處理玩家移動後的結果
   * 更新遊戲狀態、切換玩家、檢查勝負、觸發 AI 移動
   * @param result 移動結果
   * @param piece 移動的棋子
   * @param from 起始位置
   * @param to 目標位置
   * @param currentState 當前遊戲狀態
   */
  private processMoveResult(
    result: MoveResult,
    piece: ChessPiece,
    from: Position,
    to: Position,
    currentState: GameState
  ): void {
    // 更新移動歷史（生成棋譜記錄）
    const moveNotation = this.generateMoveNotation(piece, from, to, result.captured);
    const newHistory = [...currentState.moveHistory, moveNotation];

    // 切換到下一個玩家
    const nextPlayer = this.getNextPlayer(currentState.currentPlayer);

    // 評估移動後的遊戲狀態（將軍、將死、和棋等）
    const gameStatus = this.evaluateGameStatus(result, currentState);

    // 清除所有棋子的選擇狀態
    this.clearPieceSelections(currentState);

    // 更新遊戲狀態
    this.updateGameState(currentState, nextPlayer, newHistory, gameStatus);

    // 如果是人機對戰且輪到 AI，觸發 AI 移動
    this.checkAndTriggerAIMove(gameStatus.gameOver, currentState.isVsAI, nextPlayer);
  }

  private getNextPlayer(currentPlayer: PlayerColor): PlayerColor {
    return currentPlayer === PlayerColor.RED ? PlayerColor.BLACK : PlayerColor.RED;
  }

  private evaluateGameStatus(result: MoveResult, currentState: GameState): GameStatus {
    return result.status;
  }

  private clearPieceSelections(currentState: GameState): void {
    currentState.board.flat().forEach((p) => {
      if (p) p.isSelected = false;
    });
  }

  private updateGameState(
    currentState: GameState,
    nextPlayer: PlayerColor,
    newHistory: string[],
    gameStatus: GameStatus
  ): void {
    this.gameState.set({
      ...currentState,
      currentPlayer: nextPlayer,
      selectedPiece: null,
      validMoves: [],
      moveHistory: newHistory,
      status: gameStatus,
    });
  }

  private checkAndTriggerAIMove(gameOver: boolean, isVsAI: boolean, nextPlayer: PlayerColor): void {
    console.log('檢查AI觸發條件:', {
      gameOver,
      isVsAI,
      nextPlayer,
      shouldTrigger: !gameOver && isVsAI && nextPlayer === PlayerColor.BLACK,
    });

    if (!gameOver && isVsAI && nextPlayer === PlayerColor.BLACK) {
      console.log('準備觸發AI移動...');
      this.triggerAIMove();
    }
  }

  private generateMoveNotation(
    piece: ChessPiece,
    from: Position,
    to: Position,
    captured?: ChessPiece
  ): string {
    if (!piece) return '';

    const pieceSymbol = this.chessGameService.getPieceSymbol(piece);
    const file = this.getFileNumber(piece.color, from.x);
    const action = this.getMoveAction(piece.color, from, to);

    return `${pieceSymbol}${this.toChineseNum(file)}${action}`;
  }

  private toChineseNum(n: number): string {
    const chineseNum = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
    if (n >= 1 && n <= 9) {
      return chineseNum[n - 1];
    }
    return n.toString();
  }

  private getFileNumber(color: PlayerColor, x: number): number {
    return color === PlayerColor.RED ? 9 - x : x + 1;
  }

  private getMoveAction(color: PlayerColor, from: Position, to: Position): string {
    const rank = to.y - from.y;

    if (rank === 0) {
      // 平移
      const toFile = this.getFileNumber(color, to.x);
      return '平' + this.toChineseNum(toFile);
    } else {
      // 進退
      const isForward = this.isMoveForward(color, rank);
      const direction = isForward ? '進' : '退';
      return direction + this.toChineseNum(Math.abs(rank));
    }
  }

  private isMoveForward(color: PlayerColor, rank: number): boolean {
    return (color === PlayerColor.RED && rank < 0) || (color === PlayerColor.BLACK && rank > 0);
  }

  getSquareClass(x: number, y: number): string {
    let classes = 'chess-square';

    const piece = this.board()[y]?.[x];

    if (piece?.isSelected) {
      classes += ' selected';
    }

    if (this.isValidMove(x, y)) {
      classes += ' valid-move';
    }

    // 宮殿背景
    if (
      this.chessGameService.isInPalace(x, y, PlayerColor.RED) ||
      this.chessGameService.isInPalace(x, y, PlayerColor.BLACK)
    ) {
      classes += ' palace';
    }

    return classes;
  }

  getPieceClass(piece: ChessPiece | null): string {
    if (!piece) return '';

    let classes = `chess-piece ${piece.color}`;

    if (piece.isSelected) {
      classes += ' selected';
    }

    return classes;
  }

  getPieceSymbol(piece: ChessPiece | null): string {
    if (!piece) return '';
    return this.chessGameService.getPieceSymbol(piece);
  }

  getRowNumbers(): number[] {
    return Array.from({ length: 10 }, (_, i) => 10 - i);
  }

  getColumnLetters(): string[] {
    return ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
  }

  // ============ AI相關方法 ============
  toggleGameMode(): void {
    const currentState = this.gameState();
    const newIsVsAI = !currentState.isVsAI;

    // Simply toggle the mode without resetting the game
    this.gameState.set({
      ...currentState,
      isVsAI: newIsVsAI,
      aiState: {
        isThinking: false,
        thinkingText: '',
      },
    });

    // If switching to AI mode and it's currently black's turn, trigger AI move
    if (
      newIsVsAI &&
      currentState.currentPlayer === PlayerColor.BLACK &&
      !currentState.status.gameOver
    ) {
      this.triggerAIMove();
    }
  }

  private async triggerAIMove(): Promise<void> {
    const currentState = this.gameState();
    console.log('🤖 觸發AI移動，當前玩家:', currentState.currentPlayer);

    this.prepareAIThinking(currentState);

    // 使用 setTimeout 添加延遲，模擬 AI 思考
    setTimeout(async () => {
      try {
        await this.executeAIMove(currentState);
      } catch (error) {
        console.error('🤖 AI移動出錯:', error);
        this.aiSurrender();
      }
    }, GAME_CONSTANTS.AI_THINKING_DELAY);
  }

  private prepareAIThinking(currentState: GameState): void {
    // 設置AI難度
    this.chessAIService.setDifficulty(this.aiDifficulty());

    // 設置 AI 思考狀態
    this.gameState.set({
      ...currentState,
      aiState: {
        isThinking: true,
        thinkingText: this.chessAIService.getThinkingDescription(),
      },
    });
  }

  private async executeAIMove(currentState: GameState): Promise<void> {
    const aiMove = await this.chessAIService.makeAIMove(currentState);

    if (aiMove) {
      console.log('🤖 AI選擇移動:', aiMove);
      this.makeAIMove(aiMove.from, aiMove.to);
    } else {
      console.warn('🤖 AI無法找到有效移動，AI投降');
      this.aiSurrender();
    }
  }

  private makeAIMove(from: Position, to: Position): void {
    const currentState = this.gameState();
    const piece = currentState.board[from.y][from.x];
    if (!piece) return;

    const result: MoveResult = this.chessGameService.makeMove(currentState, from, to);

    if (result.success) {
      this.processAIMoveResult(result, piece, from, to, currentState);
    }
  }

  private processAIMoveResult(
    result: MoveResult,
    piece: ChessPiece,
    from: Position,
    to: Position,
    currentState: GameState
  ): void {
    // 更新移動歷史
    const moveNotation = this.generateMoveNotation(piece, from, to, result.captured);
    const newHistory = [...currentState.moveHistory, moveNotation];

    // 切換玩家 (和普通移動邏輯一致)
    const nextPlayer = this.getNextPlayer(piece.color);

    // 檢查遊戲狀態
    const gameStatus = this.evaluateGameStatus(result, currentState);
    const winner = result.status.winner;

    // 清除選擇狀態
    this.clearPieceSelections(currentState);

    this.gameState.set({
      ...currentState,
      currentPlayer: nextPlayer,
      selectedPiece: null,
      validMoves: [],
      moveHistory: newHistory,
      status: gameStatus,
      aiState: {
        isThinking: false,
        thinkingText: '',
      },
    });
  }

  private aiSurrender(): void {
    const currentState = this.gameState();
    console.log('🤖 AI投降，遊戲結束');

    // 更新遊戲狀態，AI投降，紅方（玩家）獲勝
    this.gameState.set({
      ...currentState,
      status: {
        gameOver: true,
        winner: PlayerColor.RED,
        winReason: 'AI 投降',
        isInCheck: false,
        isSelfInCheck: false,
        isCheckmate: false,
        isStalemate: false,
      },
      aiState: {
        isThinking: false,
        thinkingText: '',
      },
      moveHistory: [...currentState.moveHistory, '🤖 AI投降'],
    });
  }

  // 設置AI難度
  setAIDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
    this.aiDifficulty.set(difficulty);
    console.log('🤖 AI難度設置為:', difficulty);
  }

  // 獲取當前AI難度的中文描述
  getAIDifficultyText(): string {
    const difficulty = this.aiDifficulty();
    switch (difficulty) {
      case 'easy':
        return '簡單';
      case 'medium':
        return '中等';
      case 'hard':
        return '困難';
      default:
        return '中等';
    }
  }

  // === Gemini API 相關方法 - 保留以後可能用到 ===
  openApiKeyModal(): void {
    this.isApiKeyModalOpen.set(true);
  }

  closeApiKeyModal(): void {
    this.isApiKeyModalOpen.set(false);
  }

  clearApiKey(): void {
    // 從 localStorage 中移除 API Key
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('gemini-api-key');
    }

    // 更新 API Key 狀態
    this.chessGameService.updateApiKeyStatus();

    // 如果正在使用 Gemini AI，則自動切換回本地端 AI
    if (this.aiType() === 'service') {
      this.setAIType('local');
    }

    console.log('Gemini API Key 已清除');
  }

  onApiKeySaved(): void {
    console.log('onApiKeySaved called');
    this.chessGameService.updateApiKeyStatus();
    console.log('hasApiKey after save:', this.hasApiKey());

    // 延遲關閉 modal，確保狀態更新完成
    setTimeout(() => {
      this.closeApiKeyModal();
    }, 100);
  }

  onApiKeyCleared(): void {
    console.log('onApiKeyCleared called');
    this.chessGameService.updateApiKeyStatus();
    console.log('hasApiKey after clear:', this.hasApiKey());

    // 如果正在使用 Gemini AI，則自動切換回本地端 AI
    if (this.aiType() === 'service') {
      this.setAIType('local');
    }

    // 延遲關閉 modal，確保狀態更新完成
    setTimeout(() => {
      this.closeApiKeyModal();
    }, 100);
  }

  setAIType(type: 'local' | 'service'): void {
    this.aiType.set(type);

    // 當切換到 service 模式但沒有 API key 時，自動打開設定對話框
    if (type === 'service' && !this.hasApiKey()) {
      this.openApiKeyModal();
    }

    // 設置 ChessAIService 的 AI 類型
    this.chessAIService.setUseGeminiAI(type === 'service');

    console.log(`🤖 已切換 AI 類型: ${type}`);
  }
}
