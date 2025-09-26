import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChessAIService } from './chess-ai.service';
import { UCIEngineService } from './uci-engine.service';

@Component({
  selector: 'app-ai-config',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-gray-800 text-white p-4 rounded-lg shadow-lg mb-4">
      <h3 class="text-lg font-bold mb-3 text-yellow-400">🤖 AI 設定</h3>

      <!-- AI 狀態顯示 -->
      <div class="mb-4 p-3 bg-gray-700 rounded">
        <h4 class="font-semibold mb-2">當前狀態</h4>
        <div class="space-y-1 text-sm">
          <div class="flex items-center">
            <span class="w-20">UCI 引擎:</span>
            <span [class]="aiStatus.uciEngine ? 'text-green-400' : 'text-red-400'">
              {{ aiStatus.uciEngine ? '✅ 啟用' : '❌ 停用' }}
            </span>
            <span *ngIf="aiStatus.currentEngine" class="ml-2 text-blue-300">
              ({{ aiStatus.currentEngine }})
            </span>
          </div>
          <div class="flex items-center">
            <span class="w-20">Gemini AI:</span>
            <span [class]="aiStatus.geminiAI ? 'text-green-400' : 'text-red-400'">
              {{ aiStatus.geminiAI ? '✅ 啟用' : '❌ 停用' }}
            </span>
          </div>
          <div class="flex items-center">
            <span class="w-20">Minimax:</span>
            <span [class]="aiStatus.legacyMinimax ? 'text-green-400' : 'text-red-400'">
              {{ aiStatus.legacyMinimax ? '✅ 啟用' : '❌ 停用' }}
            </span>
          </div>
          <div class="flex items-center">
            <span class="w-20">引擎狀態:</span>
            <span [class]="aiStatus.engineReady ? 'text-green-400' : 'text-yellow-400'">
              {{ aiStatus.engineReady ? '✅ 就緒' : '⏳ 未就緒' }}
            </span>
          </div>
        </div>
      </div>

      <!-- AI 模式選擇 -->
      <div class="mb-4">
        <h4 class="font-semibold mb-2">AI 模式</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <button
            *ngFor="let mode of aiModes"
            [class]="getButtonClass(mode.value)"
            (click)="setAIMode(mode.value)">
            {{ mode.icon }} {{ mode.label }}
          </button>
        </div>
      </div>

      <!-- 可用引擎 -->
      <div class="mb-4">
        <h4 class="font-semibold mb-2">可用引擎</h4>
        <div class="space-y-2">
          <div *ngFor="let engine of availableEngines"
               class="p-2 bg-gray-600 rounded text-sm">
            <div class="flex justify-between items-center">
              <span class="font-medium">{{ engine.name }}</span>
              <span class="text-yellow-400">難度: {{ engine.difficulty }}/10</span>
            </div>
            <div class="text-gray-300 text-xs">{{ engine.description }}</div>
            <button
              class="mt-1 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
              (click)="initializeEngine(engine.name)"
              [disabled]="isInitializing">
              {{ currentEngine === engine.name ? '✅ 使用中' : '🚀 初始化' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 快速操作 -->
      <div class="flex flex-wrap gap-2">
        <button
          class="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 rounded"
          (click)="quickSetup()"
          [disabled]="isInitializing">
          ⚡ 快速設置 (推薦)
        </button>
        <button
          class="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded"
          (click)="resetAI()">
          🔄 重置
        </button>
      </div>

      <!-- 初始化狀態 -->
      <div *ngIf="isInitializing" class="mt-3 text-center text-yellow-400">
        ⏳ 正在初始化引擎...
      </div>
    </div>
  `
})
export class AIConfigComponent implements OnInit {
  private chessAI = inject(ChessAIService);
  private uciEngine = inject(UCIEngineService);

  protected aiStatus: any = {};
  protected currentEngine: string | null = null;
  protected isInitializing = false;
  protected availableEngines: any[] = [];

  protected aiModes = [
    { value: 'auto', label: '自動 (推薦)', icon: '⚡' },
    { value: 'uci-only', label: 'UCI 引擎', icon: '🏆' },
    { value: 'gemini-only', label: 'Gemini AI', icon: '🤖' },
    { value: 'minimax-only', label: 'Minimax', icon: '🧠' },
    { value: 'mixed', label: '混合模式', icon: '🔀' }
  ];

  ngOnInit() {
    this.updateStatus();
    this.availableEngines = this.uciEngine.getAvailableEngines();
  }

  private updateStatus() {
    this.aiStatus = this.chessAI.getAIStatus();
    this.currentEngine = this.aiStatus.currentEngine;
  }

  protected setAIMode(mode: any) {
    console.log(`🔧 設置 AI 模式: ${mode}`);
    this.chessAI.setAIMode(mode);
    this.updateStatus();
  }

  protected getButtonClass(mode: string): string {
    const baseClass = 'px-3 py-2 text-sm rounded transition-colors ';

    // 判斷當前模式
    const currentMode = this.getCurrentMode();

    if (mode === currentMode) {
      return baseClass + 'bg-blue-600 text-white';
    } else {
      return baseClass + 'bg-gray-600 hover:bg-gray-500 text-gray-200';
    }
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

  protected async initializeEngine(engineName: string) {
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

  protected async quickSetup() {
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

  protected resetAI() {
    console.log('🔄 重置 AI 設定');
    this.chessAI.setAIMode('auto');
    this.updateStatus();
  }
}