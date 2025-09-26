import { Injectable, inject } from '@angular/core';
import { GameState, PlayerColor, Position } from '../chess-piece.interface';
import { BaseAIStrategy } from './base-ai-strategy';
import { GeminiAIStrategy } from './gemini-ai-strategy';
import { MinimaxStrategy } from './minimax-strategy';
import { ChessGameService } from '../chess-game.service';

@Injectable({
  providedIn: 'root'
})
export class StrategyManager {
  private chessGameService = inject(ChessGameService);
  private geminiStrategy = inject(GeminiAIStrategy);
  private minimaxStrategy = inject(MinimaxStrategy);

  private strategies: BaseAIStrategy[] = [];
  private enabledStrategies = {
    gemini: false,
    minimax: true  // 預設使用 Minimax
  };

  constructor() {
    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    this.strategies = [
      this.geminiStrategy,
      this.minimaxStrategy
    ];
  }

  async executeAIMove(gameState: GameState): Promise<{ from: Position; to: Position } | null> {
    console.log(`🧠 AI開始思考...`);
    const startTime = Date.now();

    try {
      // 獲取啟用的策略並按優先級排序
      const enabledStrategies = this.getEnabledStrategiesList()
        .sort((a, b) => a.priority - b.priority);

      for (const strategy of enabledStrategies) {
        console.log(`🎯 嘗試策略: ${strategy.name}`);

        const isAvailable = await strategy.isAvailable();
        if (!isAvailable) {
          console.log(`⚠️ 策略 ${strategy.name} 不可用，嘗試下一個...`);
          continue;
        }

        const result = await strategy.makeMove(gameState);
        if (result) {
          const elapsed = Date.now() - startTime;
          console.log(`✅ 策略 ${strategy.name} 決策成功: ${elapsed}ms`);
          console.log(`🏆 選擇移動: (${result.from.x},${result.from.y}) -> (${result.to.x},${result.to.y})`);

          if (result.analysis) {
            console.log(`📊 分析: ${result.analysis}`);
          }

          return { from: result.from, to: result.to };
        }

        console.log(`❌ 策略 ${strategy.name} 未能提供有效移動`);
      }

      // 所有策略都失敗，使用緊急備案
      console.log('🎲 使用隨機移動作為最後備案...');
      const moves = this.getAllPossibleMoves(gameState, PlayerColor.BLACK);
      return moves.length > 0 ? moves[Math.floor(Math.random() * moves.length)] : null;

    } catch (error) {
      console.error('🤖 AI思考出錯:', error);
      const moves = this.getAllPossibleMoves(gameState, PlayerColor.BLACK);
      return moves.length > 0 ? moves[0] : null;
    }
  }

  private getEnabledStrategiesList(): BaseAIStrategy[] {
    return this.strategies.filter((strategy) => {
      if (strategy instanceof GeminiAIStrategy) return this.enabledStrategies.gemini;
      if (strategy instanceof MinimaxStrategy) return this.enabledStrategies.minimax;
      return false;
    });
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
            moves.push({ from: piece.position, to: moveTo });
          }
        }
      }
    }

    return moves;
  }

  // 策略控制方法
  setGeminiEnabled(enabled: boolean): void {
    this.enabledStrategies.gemini = enabled;
    console.log(`🤖 Gemini AI 策略: ${enabled ? '啟用' : '停用'}`);
  }

  setMinimaxEnabled(enabled: boolean): void {
    this.enabledStrategies.minimax = enabled;
    console.log(`🧠 Minimax 策略: ${enabled ? '啟用' : '停用'}`);
  }

  // 設置 AI 模式
  setAIMode(mode: 'gemini-only' | 'minimax-only' | 'mixed' | 'auto'): void {
    switch (mode) {
      case 'gemini-only':
        this.enabledStrategies = { gemini: true, minimax: false };
        console.log('🤖 AI 模式: 僅使用 Gemini AI');
        break;
      case 'minimax-only':
        this.enabledStrategies = { gemini: false, minimax: true };
        console.log('🧠 AI 模式: 僅使用 Minimax 算法');
        break;
      case 'mixed':
        this.enabledStrategies = { gemini: true, minimax: true };
        console.log('🔀 AI 模式: 混合模式 (Gemini → Minimax)');
        break;
      case 'auto':
      default:
        this.enabledStrategies = { gemini: false, minimax: true };
        console.log('⚡ AI 模式: 自動 (優先 Minimax 算法)');
        break;
    }
  }

  // 設置難度 (影響 Minimax)
  setDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
    this.minimaxStrategy.setDifficulty(difficulty);
    console.log(`🎯 AI 策略難度設置為: ${difficulty}`);
  }

  // 獲取當前思考狀態
  getThinkingDescription(): string {
    const enabledStrategies = this.getEnabledStrategiesList()
      .sort((a, b) => a.priority - b.priority);

    const activeStrategy = enabledStrategies[0];
    return activeStrategy?.getThinkingDescription() || '🎲 AI正在選擇移動...';
  }

  // 獲取策略狀態
  getStrategyStatus(): {
    gemini: boolean;
    minimax: boolean;
  } {
    return { ...this.enabledStrategies };
  }
}