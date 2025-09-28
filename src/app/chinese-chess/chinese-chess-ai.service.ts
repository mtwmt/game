import { inject, Injectable } from '@angular/core';
import { Position, GameState } from './chinese-chess-piece.interface';
import { StrategyService } from './strategies/strategy-service';

@Injectable({
  providedIn: 'root',
})
export class ChineseChessAiService {
  private strategyService = inject(StrategyService);

  async makeAIMove(gameState: GameState): Promise<{ from: Position; to: Position } | null> {
    return this.strategyService.executeAIMove(gameState);
  }

  // AI 模式控制方法 - 委託給AI協調器
  setUseGeminiAI(use: boolean): void {
    this.strategyService.setGeminiEnabled(use);
  }

  // 設置 AI 模式
  setAIMode(mode: 'xqwlight-only' | 'gemini-only' | 'mixed' | 'auto'): void {
    this.strategyService.setAIMode(mode);
  }

  // XQWLight 控制方法
  setUseXQWLight(use: boolean): void {
    this.strategyService.setXQWLightEnabled(use);
  }

  // 獲取當前 AI 狀態
  getAIStatus(): {
    xqwlight: boolean;
    geminiAI: boolean;
  } {
    const coordinatorStatus = this.strategyService.getStrategyStatus();
    return {
      xqwlight: coordinatorStatus.xqwlight,
      geminiAI: coordinatorStatus.gemini,
    };
  }

  // 設置難度 - 委託給AI協調器
  setDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
    this.strategyService.setDifficulty(difficulty);
  }

  getThinkingDescription(): string {
    return this.strategyService.getThinkingDescription();
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

    if (aiStatus.xqwlight) {
      mode = 'xqwlight';
      description = 'XQWLight 專業引擎思考中...';
    } else if (aiStatus.geminiAI) {
      mode = 'gemini';
      description = 'Gemini AI 思考中...';
    } else {
      mode = 'random';
      description = '隨機選擇中...';
    }

    return {
      description,
      mode,
      isThinking: true,
    };
  }
}
