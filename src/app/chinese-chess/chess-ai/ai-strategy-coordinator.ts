import { Injectable, inject } from '@angular/core';
import { GameState, PlayerColor, Position } from '../chess-piece.interface';
import { BaseAIStrategy } from './base-ai-strategy';
import { GeminiAIStrategy } from './gemini-ai-strategy';
import { XQWLightStrategy } from './xqwlight-strategy';
import { ChessGameService } from '../chess-game.service';

@Injectable({
  providedIn: 'root',
})
export class AIStrategyCoordinator {
  private chessGameService = inject(ChessGameService);
  private geminiStrategy = inject(GeminiAIStrategy);
  private xqwlightStrategy = inject(XQWLightStrategy);

  private strategies: BaseAIStrategy[] = [];
  private enabledStrategies = {
    xqwlight: true,
    gemini: false,
  };

  constructor() {
    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    this.strategies = [
      this.xqwlightStrategy, // 最高優先級
      this.geminiStrategy,
    ];
  }

  async executeAIMove(gameState: GameState): Promise<{ from: Position; to: Position } | null> {
    console.log(`🧠 AI開始思考...`);
    const startTime = Date.now();

    try {
      // 獲取啟用的策略並按優先級排序
      const enabledStrategies = this.getEnabledStrategiesList().sort(
        (a, b) => a.priority - b.priority
      );

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
          console.log(
            `🏆 選擇移動: (${result.from.x},${result.from.y}) -> (${result.to.x},${result.to.y})`
          );

          if (result.analysis) {
            console.log(`📊 分析: ${result.analysis}`);
          }

          return { from: result.from, to: result.to };
        }

        console.log(`❌ 策略 ${strategy.name} 未能提供有效移動`);
      }

      // 所有策略都失敗，使用緊急備案
      console.log('🎲 使用隨機移動作為最後備案...');
      return this.getEmergencyMove(gameState);
    } catch (error) {
      console.error('🤖 AI思考出錯:', error);
      return this.getEmergencyMove(gameState);
    }
  }

  private getEnabledStrategiesList(): BaseAIStrategy[] {
    return this.strategies.filter((strategy) => {
      if (strategy instanceof XQWLightStrategy) return this.enabledStrategies.xqwlight;
      if (strategy instanceof GeminiAIStrategy) return this.enabledStrategies.gemini;
      return false;
    });
  }

  // 緊急備案：使用 ChessGameService 獲取隨機合法移動
  private getEmergencyMove(gameState: GameState): { from: Position; to: Position } | null {
    return this.chessGameService.getRandomLegalMove(gameState, PlayerColor.BLACK);
  }

  // 策略控制方法
  setGeminiEnabled(enabled: boolean): void {
    this.enabledStrategies.gemini = enabled;
    console.log(`🤖 Gemini AI 策略: ${enabled ? '啟用' : '停用'}`);
  }

  setXQWLightEnabled(enabled: boolean): void {
    this.enabledStrategies.xqwlight = enabled;
    console.log(`🔥 XQWLight 專業引擎: ${enabled ? '啟用' : '停用'}`);
  }

  // 設置 AI 模式
  setAIMode(mode: 'xqwlight-only' | 'gemini-only' | 'mixed' | 'auto'): void {
    switch (mode) {
      case 'xqwlight-only':
        this.enabledStrategies = { xqwlight: true, gemini: false };
        console.log('🔥 AI 模式: 僅使用 XQWLight 專業引擎');
        break;
      case 'gemini-only':
        this.enabledStrategies = { xqwlight: false, gemini: true };
        console.log('🤖 AI 模式: 僅使用 Gemini AI');
        break;
      case 'mixed':
        this.enabledStrategies = { xqwlight: true, gemini: true };
        console.log('🔀 AI 模式: 混合模式 (XQWLight → Gemini)');
        break;
      case 'auto':
      default:
        this.enabledStrategies = { xqwlight: true, gemini: false };
        console.log('⚡ AI 模式: 自動 (優先 XQWLight 專業引擎)');
        break;
    }
  }

  // 設置難度 (影響 XQWLight 引擎)
  setDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
    this.xqwlightStrategy.setDifficulty(difficulty);
    console.log(`🎯 XQWLight 引擎難度設置為: ${difficulty}`);
  }

  // 獲取當前思考狀態
  getThinkingDescription(): string {
    const enabledStrategies = this.getEnabledStrategiesList().sort(
      (a, b) => a.priority - b.priority
    );

    const activeStrategy = enabledStrategies[0];
    return activeStrategy?.getThinkingDescription() || '🎲 AI正在選擇移動...';
  }

  // 獲取策略狀態
  getStrategyStatus(): {
    xqwlight: boolean;
    gemini: boolean;
  } {
    return { ...this.enabledStrategies };
  }
}
