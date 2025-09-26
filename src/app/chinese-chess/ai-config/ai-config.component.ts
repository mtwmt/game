import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChessAIService } from '../chess-ai.service';
import { UCIEngineService } from '../uci-engine.service';
import { AIStatus, AIMode, EngineInfo } from './ai-config.interface';

@Component({
  selector: 'app-ai-config',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-config.component.html',
  styleUrl: './ai-config.component.scss'
})
export class AIConfigComponent implements OnInit {
  private chessAI = inject(ChessAIService);
  private uciEngine = inject(UCIEngineService);

  protected aiStatus: AIStatus = {
    uciEngine: false,
    geminiAI: false,
    legacyMinimax: false,
    engineReady: false,
    currentEngine: null
  };

  protected currentEngine: string | null = null;
  protected isInitializing = false;
  protected availableEngines: EngineInfo[] = [];

  protected readonly aiModes: AIMode[] = [
    { value: 'auto', label: '自動 (推薦)', icon: '⚡' },
    { value: 'uci-only', label: 'UCI 引擎', icon: '🏆' },
    { value: 'gemini-only', label: 'Gemini AI', icon: '🤖' },
    { value: 'minimax-only', label: 'Minimax', icon: '🧠' },
    { value: 'mixed', label: '混合模式', icon: '🔀' }
  ];

  ngOnInit(): void {
    this.updateStatus();
    this.availableEngines = this.uciEngine.getAvailableEngines();
  }

  private updateStatus(): void {
    this.aiStatus = this.chessAI.getAIStatus();
    this.currentEngine = this.aiStatus.currentEngine;
  }

  protected setAIMode(mode: string): void {
    console.log(`🔧 設置 AI 模式: ${mode}`);
    this.chessAI.setAIMode(mode as any);
    this.updateStatus();
  }

  protected getButtonClass(mode: string): string {
    const currentMode = this.getCurrentMode();
    const isActive = mode === currentMode;

    return isActive ? 'btn-active' : 'btn-inactive';
  }

  private getCurrentMode(): string {
    const status = this.aiStatus;
    if (status.uciEngine && !status.geminiAI && !status.legacyMinimax) {
      return 'uci-only';
    } else if (!status.uciEngine && status.geminiAI && !status.legacyMinimax) {
      return 'gemini-only';
    } else if (!status.uciEngine && !status.geminiAI && status.legacyMinimax) {
      return 'minimax-only';
    } else if (status.uciEngine && status.geminiAI && status.legacyMinimax) {
      return 'mixed';
    } else {
      return 'auto';
    }
  }

  protected async initializeEngine(engineName: string): Promise<void> {
    this.isInitializing = true;
    try {
      console.log(`🚀 初始化引擎: ${engineName}`);
      const success = await this.chessAI.initializeAI(engineName);
      if (success) {
        console.log(`✅ 引擎 ${engineName} 初始化成功`);
        this.updateStatus();
      } else {
        console.error(`❌ 引擎 ${engineName} 初始化失敗`);
      }
    } catch (error) {
      console.error('引擎初始化錯誤:', error);
    } finally {
      this.isInitializing = false;
    }
  }

  protected async quickSetup(): Promise<void> {
    console.log('⚡ 執行快速設置...');
    this.isInitializing = true;
    try {
      // 嘗試初始化 Pikafish 引擎
      const success = await this.chessAI.initializeAI('Pikafish');
      if (success) {
        this.chessAI.setAIMode('auto');
        console.log('✅ 快速設置完成 - 使用 Pikafish 引擎');
      } else {
        // 如果失敗，使用 Gemini AI 備案
        this.chessAI.setAIMode('gemini-only');
        console.log('⚠️ UCI 引擎不可用，切換到 Gemini AI');
      }
      this.updateStatus();
    } catch (error) {
      console.error('快速設置失敗:', error);
      // 最後備案：使用 Minimax
      this.chessAI.setAIMode('minimax-only');
      this.updateStatus();
    } finally {
      this.isInitializing = false;
    }
  }

  protected resetAI(): void {
    console.log('🔄 重置 AI 設定');
    this.chessAI.setAIMode('auto');
    this.updateStatus();
  }
}
