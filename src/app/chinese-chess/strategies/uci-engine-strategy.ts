import { Injectable, inject } from '@angular/core';
import { BaseAIStrategy, AIStrategyResult } from './base-ai-strategy';
import { PlayerColor, GameState } from '../chess-piece.interface';
import { UCIEngineService } from '../uci-engine.service';
import { ChessGameService } from '../chess-game.service';
import { XQWLightEngine } from '../engines/xqwlight-engine';

@Injectable({
  providedIn: 'root'
})
export class UCIEngineStrategy extends BaseAIStrategy {
  readonly name = 'XQWLight引擎';
  readonly priority = 1;

  private uciEngineService = inject(UCIEngineService);
  private chessGameService = inject(ChessGameService);
  private xqwlightEngine: XQWLightEngine;

  // 難度設置 (1-10)，默認為 7 (困難)
  private difficultyLevel = 7;

  constructor() {
    super();
    this.xqwlightEngine = new XQWLightEngine(this.chessGameService);
    this.xqwlightEngine.setDifficulty(this.difficultyLevel);
  }

  async isAvailable(): Promise<boolean> {
    // XQWLight 引擎總是可用 (純前端，無需初始化)
    return true;
  }

  async makeMove(gameState: GameState): Promise<AIStrategyResult | null> {
    try {
      console.log(`🧠 XQWLight 引擎開始分析 (難度 ${this.difficultyLevel})...`);

      // 使用 XQWLight 引擎搜索最佳移動
      const result = await this.xqwlightEngine.searchBestMove(gameState);

      if (result) {
        console.log(`✅ XQWLight 引擎分析完成: 評分=${result.score}, 節點=${result.nodes}, 時間=${result.time}ms`);

        return {
          from: result.from,
          to: result.to,
          score: result.score,
          analysis: `XQWLight 深度${result.depth}, ${result.nodes}節點, ${result.time}ms, 評分${result.score}`
        };
      }

      console.log('❌ XQWLight 引擎未找到有效移動');
      return null;
    } catch (error) {
      console.error('❌ XQWLight 引擎調用失敗:', error);
      return null;
    }
  }

  getThinkingDescription(): string {
    return `🧠 XQWLight 引擎正在深度分析 (難度 ${this.difficultyLevel})...`;
  }

  // 設置 XQWLight 引擎難度
  setDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
    switch (difficulty) {
      case 'easy':
        this.difficultyLevel = 3;
        break;
      case 'medium':
        this.difficultyLevel = 5;
        break;
      case 'hard':
        this.difficultyLevel = 7;
        break;
    }
    this.xqwlightEngine.setDifficulty(this.difficultyLevel);
    console.log(`🔧 XQWLight 引擎難度設置為: ${difficulty} (等級 ${this.difficultyLevel})`);
  }
}