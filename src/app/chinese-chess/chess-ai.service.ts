import { inject, Injectable } from '@angular/core';
import { PlayerColor, Position, GameState } from './chess-piece.interface';
import { UCIEngineService } from './uci-engine.service';
import { StrategyManager } from './strategies/strategy-manager';

@Injectable({
  providedIn: 'root',
})
export class ChessAIService {
  private uciEngineService = inject(UCIEngineService);
  private strategyManager = inject(StrategyManager);

  async makeAIMove(gameState: GameState): Promise<{ from: Position; to: Position } | null> {
    return this.strategyManager.executeAIMove(gameState);
  }


  // AI 模式控制方法 - 委託給策略管理器
  setUseUCIEngine(use: boolean): void {
    this.strategyManager.setUCIEngineEnabled(use);
  }

  setUseGeminiAI(use: boolean): void {
    this.strategyManager.setGeminiEnabled(use);
  }

  setUseLegacyMinimax(use: boolean): void {
    this.strategyManager.setMinimaxEnabled(use);
  }

  // 設置 AI 優先級模式
  setAIMode(mode: 'uci-only' | 'gemini-only' | 'minimax-only' | 'mixed' | 'auto'): void {
    this.strategyManager.setAIMode(mode);
  }

  // 初始化並設置引擎
  async initializeAI(engineName: string = 'Pikafish'): Promise<boolean> {
    console.log(`🚀 初始化 AI 系統，使用引擎: ${engineName}`);
    try {
      const success = await this.uciEngineService.initializeEngine(engineName);
      if (success) {
        console.log(`✅ AI 系統初始化完成`);
        this.setAIMode('auto'); // 設置為自動模式
      }
      return success;
    } catch (error) {
      console.error('❌ AI 系統初始化失敗:', error);
      return false;
    }
  }

  // 獲取當前 AI 狀態
  getAIStatus(): {
    uciEngine: boolean;
    geminiAI: boolean;
    legacyMinimax: boolean;
    currentEngine: string | null;
    engineReady: boolean;
  } {
    const strategyStatus = this.strategyManager.getStrategyStatus();
    return {
      uciEngine: strategyStatus.uci,
      geminiAI: strategyStatus.gemini,
      legacyMinimax: strategyStatus.minimax,
      currentEngine: this.uciEngineService.currentEngineName,
      engineReady: this.uciEngineService.getEngineInfo()?.isReady || false
    };
  }

  // 設置難度 - 委託給策略管理器 (影響所有 AI 策略)
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
    engine?: string;
    isThinking: boolean;
  } {
    const aiStatus = this.getAIStatus();
    let mode = 'unknown';
    let description = '';

    if (aiStatus.uciEngine) {
      mode = 'uci';
      description = `${aiStatus.currentEngine || 'UCI引擎'} 分析中...`;
    } else if (aiStatus.geminiAI) {
      mode = 'gemini';
      description = 'Gemini AI 思考中...';
    } else if (aiStatus.legacyMinimax) {
      mode = 'minimax';
      description = 'Minimax 算法計算中...';
    } else {
      mode = 'random';
      description = '隨機選擇中...';
    }

    return {
      description,
      mode,
      engine: aiStatus.currentEngine || undefined,
      isThinking: true // 可以從 uciEngineService 獲取實際狀態
    };
  }
}
