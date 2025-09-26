import { inject, Injectable } from '@angular/core';
import { PlayerColor, Position, GameState } from './chess-piece.interface';
import { StrategyManager } from './strategies/strategy-manager';

@Injectable({
  providedIn: 'root',
})
export class ChessAIService {
  private strategyManager = inject(StrategyManager);

  async makeAIMove(gameState: GameState): Promise<{ from: Position; to: Position } | null> {
    return this.strategyManager.executeAIMove(gameState);
  }

  // AI 模式控制方法 - 委託給策略管理器
  setUseGeminiAI(use: boolean): void {
    this.strategyManager.setGeminiEnabled(use);
  }

  setUseMinimax(use: boolean): void {
    this.strategyManager.setMinimaxEnabled(use);
  }

  // 設置 AI 模式
  setAIMode(mode: 'gemini-only' | 'minimax-only' | 'mixed' | 'auto'): void {
    this.strategyManager.setAIMode(mode);
  }

  // 獲取當前 AI 狀態
  getAIStatus(): {
    geminiAI: boolean;
    minimax: boolean;
  } {
    const strategyStatus = this.strategyManager.getStrategyStatus();
    return {
      geminiAI: strategyStatus.gemini,
      minimax: strategyStatus.minimax
    };
  }

  // 設置難度 - 委託給策略管理器
  setDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
    this.strategyManager.setDifficulty(difficulty);
  }

  getThinkingDescription(): string {
    return this.strategyManager.getThinkingDescription();
  }

  // 獲取詳細的思考狀態
  getDetailedThinkingStatus(): {
    description: string;
    mode: string;
    isThinking: boolean;
  } {
    const aiStatus = this.getAIStatus();
    let mode = 'unknown';
    let description = '';

    if (aiStatus.geminiAI) {
      mode = 'gemini';
      description = 'Gemini AI 思考中...';
    } else if (aiStatus.minimax) {
      mode = 'minimax';
      description = 'Minimax 算法計算中...';
    } else {
      mode = 'random';
      description = '隨機選擇中...';
    }

    return {
      description,
      mode,
      isThinking: true
    };
  }
}
