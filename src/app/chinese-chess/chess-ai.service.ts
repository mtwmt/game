import { inject, Injectable } from '@angular/core';
import { PlayerColor, Position, GameState } from './chess-piece.interface';
import { AIStrategyCoordinator } from './chess-ai/ai-strategy-coordinator';

@Injectable({
  providedIn: 'root',
})
export class ChessAIService {
  private aiCoordinator = inject(AIStrategyCoordinator);

  async makeAIMove(gameState: GameState): Promise<{ from: Position; to: Position } | null> {
    return this.aiCoordinator.executeAIMove(gameState);
  }

  // AI 模式控制方法 - 委託給AI協調器
  setUseGeminiAI(use: boolean): void {
    this.aiCoordinator.setGeminiEnabled(use);
  }

  // 設置 AI 模式
  setAIMode(mode: 'xqwlight-only' | 'gemini-only' | 'mixed' | 'auto'): void {
    this.aiCoordinator.setAIMode(mode);
  }

  // XQWLight 控制方法
  setUseXQWLight(use: boolean): void {
    this.aiCoordinator.setXQWLightEnabled(use);
  }

  // 獲取當前 AI 狀態
  getAIStatus(): {
    xqwlight: boolean;
    geminiAI: boolean;
  } {
    const coordinatorStatus = this.aiCoordinator.getStrategyStatus();
    return {
      xqwlight: coordinatorStatus.xqwlight,
      geminiAI: coordinatorStatus.gemini
    };
  }

  // 設置難度 - 委託給AI協調器
  setDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
    this.aiCoordinator.setDifficulty(difficulty);
  }

  getThinkingDescription(): string {
    return this.aiCoordinator.getThinkingDescription();
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
      isThinking: true
    };
  }
}
