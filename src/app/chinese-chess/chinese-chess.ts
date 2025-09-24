import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ChessGameService, initialState } from './chess-game.service';
import { ChessAIService } from './chess-ai.service';
import { ChessPiece, PlayerColor, Position, GameState, MoveResult } from './chess-piece.interface';

@Component({
  selector: 'app-chinese-chess',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './chinese-chess.html',
  styleUrl: './chinese-chess.scss',
})
export class ChineseChess implements OnInit {
  private chessGameService = inject(ChessGameService);
  private chessAIService = inject(ChessAIService);

  protected gameState = signal<GameState>(initialState);

  protected board = computed(() => this.gameState().board);
  protected currentPlayer = computed(() => this.gameState().currentPlayer);
  protected selectedPiece = computed(() => this.gameState().selectedPiece);
  protected validMoves = computed(() => this.gameState().validMoves);
  protected gameOver = computed(() => this.gameState().gameOver);
  protected winner = computed(() => this.gameState().winner);
  protected moveHistory = computed(() => this.gameState().moveHistory);
  protected isInCheck = computed(() => this.gameState().isInCheck);
  protected isSelfInCheck = computed(() => this.gameState().isSelfInCheck);

  protected currentPlayerDisplay = computed(() =>
    this.currentPlayer() === PlayerColor.RED ? '紅方' : '黑方'
  );

  protected isVsAI = computed(() => this.gameState().isVsAI);
  protected aiIsThinking = computed(() => this.gameState().aiIsThinking);
  protected aiThinkingText = computed(() => this.gameState().aiThinkingText);

  protected aiDifficulty = signal<'easy' | 'medium' | 'hard'>('medium');

  // 檢查是否是AI回合
  protected isAITurn = computed(
    () => this.isVsAI() && this.currentPlayer() === PlayerColor.BLACK && !this.gameOver()
  );

  // 檢查是否可以點擊棋盤（不是AI回合）
  protected canInteract = computed(
    () => !this.isVsAI() || this.currentPlayer() === PlayerColor.RED
  );

  protected readonly PlayerColor = PlayerColor;
  protected readonly Math = Math;

  ngOnInit(): void {
    this.resetGame();
  }

  resetGame(): void {
    const newGameState = this.chessGameService.initializeGameState();
    this.gameState.set(newGameState);
  }

  onSquareClick(x: number, y: number): void {
    if (this.gameOver() || !this.canInteract()) return;

    const currentState = this.gameState();
    const piece = currentState.board[y][x];

    if (currentState.selectedPiece) {
      // 已選擇棋子，嘗試移動或選擇新棋子
      if (
        piece &&
        piece.color === currentState.currentPlayer &&
        piece !== currentState.selectedPiece
      ) {
        // 選擇新的己方棋子
        this.selectPiece(piece);
      } else if (this.isValidMove(x, y)) {
        // 移動棋子
        this.makeMove(currentState.selectedPiece.position, { x, y });
      } else {
        // 取消選擇
        this.deselectPiece();
      }
    } else if (piece && piece.color === currentState.currentPlayer) {
      // 選擇棋子
      this.selectPiece(piece);
    }
  }

  private selectPiece(piece: ChessPiece): void {
    const currentState = this.gameState();

    // 清除之前的選擇狀態
    currentState.board.flat().forEach((p) => {
      if (p) p.isSelected = false;
    });

    // 設定新選擇
    piece.isSelected = true;
    const validMoves = this.chessGameService.getPossibleMoves(piece, currentState.board);

    this.gameState.set({
      ...currentState,
      selectedPiece: piece,
      validMoves,
    });
  }

  private deselectPiece(): void {
    const currentState = this.gameState();

    if (currentState.selectedPiece) {
      currentState.selectedPiece.isSelected = false;
    }

    this.gameState.set({
      ...currentState,
      selectedPiece: null,
      validMoves: [],
    });
  }

  protected isValidMove(x: number, y: number): boolean {
    return this.validMoves().some((move) => move.x === x && move.y === y);
  }

  private makeMove(from: Position, to: Position): void {
    const currentState = this.gameState();
    const piece = currentState.board[from.y][from.x];
    if (!piece) return;

    const result: MoveResult = this.chessGameService.makeMove(currentState, from, to);

    if (result.success) {
      // 更新移動歷史
      const moveNotation = this.generateMoveNotation(piece, from, to, result.captured);
      const newHistory = [...currentState.moveHistory, moveNotation];

      // 切換玩家
      const nextPlayer =
        currentState.currentPlayer === PlayerColor.RED ? PlayerColor.BLACK : PlayerColor.RED;

      // 檢查遊戲狀態
      const isInCheck = result.isCheck || false;
      const isSelfInCheck = result.isSelfInCheck || false;
      const gameOver = result.isCheckmate || result.isStalemate || result.gameOver || false;
      const winner = result.winner || (result.isCheckmate ? currentState.currentPlayer : null);

      // 清除選擇狀態
      currentState.board.flat().forEach((p) => {
        if (p) p.isSelected = false;
      });

      this.gameState.set({
        ...currentState,
        currentPlayer: nextPlayer,
        selectedPiece: null,
        validMoves: [],
        moveHistory: newHistory,
        isInCheck,
        isSelfInCheck,
        gameOver,
        winner,
      });

      // 如果是AI對戰模式且輪到AI，觸發AI移動
      console.log('檢查AI觸發條件:', {
        gameOver,
        isVsAI: currentState.isVsAI,
        nextPlayer,
        shouldTrigger: !gameOver && currentState.isVsAI && nextPlayer === PlayerColor.BLACK,
      });
      if (!gameOver && currentState.isVsAI && nextPlayer === PlayerColor.BLACK) {
        console.log('準備觸發AI移動...');
        this.triggerAIMove();
      }
    }
  }

  private generateMoveNotation(
    piece: ChessPiece,
    from: Position,
    to: Position,
    captured?: ChessPiece
  ): string {
    // const piece = this.board()[from.y][from.x];
    if (!piece) return '';

    const pieceSymbol = this.chessGameService.getPieceSymbol(piece);
    // const captureSymbol = captured ? '吃' : '到';

    // 傳統中國象棋棋譜格式（例如：炮二平五、馬八進七）
    const file = piece.color === PlayerColor.RED ? 9 - from.x : from.x + 1;
    const rank = to.y - from.y;

    let action = '';
    if (rank === 0) {
      action = '平' + (piece.color === PlayerColor.RED ? 9 - to.x : to.x + 1);
    } else {
      // 修改進退邏輯，考慮紅黑雙方的方向差異
      const isForward =
        (piece.color === PlayerColor.RED && rank < 0) ||
        (piece.color === PlayerColor.BLACK && rank > 0);
      action = (isForward ? '進' : '退') + Math.abs(rank);
    }

    return `${pieceSymbol}${file}${action}`;
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
      aiIsThinking: false, // Reset AI thinking state when switching
    });

    // If switching to AI mode and it's currently black's turn, trigger AI move
    if (newIsVsAI && currentState.currentPlayer === PlayerColor.BLACK && !currentState.gameOver) {
      this.triggerAIMove();
    }
  }

  private triggerAIMove(): void {
    const currentState = this.gameState();
    console.log('🤖 觸發AI移動，當前玩家:', currentState.currentPlayer);

    // 設置AI難度
    this.chessAIService.setDifficulty(this.aiDifficulty());

    // 先設置 AI 思考狀態
    this.gameState.set({
      ...currentState,
      aiIsThinking: true,
      aiThinkingText: this.chessAIService.getThinkingDescription(currentState),
    });

    // 使用 setTimeout 添加延遲，模擬 AI 思考
    setTimeout(() => {
      try {
        // 讓AI決定移動
        const aiMove = this.chessAIService.makeAIMove(currentState);

        if (aiMove) {
          console.log('🤖 AI選擇移動:', aiMove);
          // 執行AI移動
          this.makeAIMove(aiMove.from, aiMove.to);
        } else {
          console.warn('🤖 AI無法找到有效移動，AI投降');
          // AI投降，遊戲結束
          this.aiSurrender();
        }
      } catch (error) {
        console.error('🤖 AI移動出錯:', error);
        // 發生錯誤時AI投降
        this.aiSurrender();
      }
    }, 500); // 減少延遲時間到500ms
  }

  private makeAIMove(from: Position, to: Position): void {
    const currentState = this.gameState();

    const piece = currentState.board[from.y][from.x];
    if (!piece) return;

    // 執行移動（復用現有邏輯）
    const result: MoveResult = this.chessGameService.makeMove(currentState, from, to);

    if (result.success) {
      // 更新移動歷史
      const moveNotation = this.generateMoveNotation(piece, from, to, result.captured);
      const newHistory = [...currentState.moveHistory, moveNotation];

      // 切換回玩家
      const nextPlayer = PlayerColor.RED;

      // 檢查遊戲狀態
      const isInCheck = result.isCheck || false;
      const isSelfInCheck = result.isSelfInCheck || false;
      const gameOver = result.isCheckmate || result.isStalemate || result.gameOver || false;
      const winner = result.winner || (result.isCheckmate ? PlayerColor.BLACK : null);

      // 清除選擇狀態
      currentState.board.flat().forEach((p) => {
        if (p) p.isSelected = false;
      });

      this.gameState.set({
        ...currentState,
        currentPlayer: nextPlayer,
        selectedPiece: null,
        validMoves: [],
        moveHistory: newHistory,
        isInCheck,
        isSelfInCheck,
        gameOver,
        winner,
        aiIsThinking: false, // 重置 AI 思考狀態
      });
    }
  }

  private aiSurrender(): void {
    const currentState = this.gameState();
    console.log('🤖 AI投降，遊戲結束');

    // 更新遊戲狀態，AI投降，紅方（玩家）獲勝
    this.gameState.set({
      ...currentState,
      gameOver: true,
      winner: PlayerColor.RED,
      aiIsThinking: false,
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
      case 'easy': return '簡單';
      case 'medium': return '中等';
      case 'hard': return '困難';
      default: return '中等';
    }
  }
}
