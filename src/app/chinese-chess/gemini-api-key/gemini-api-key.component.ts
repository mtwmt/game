import { ChangeDetectionStrategy, Component, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChineseChessService } from '../chinese-chess.service';

@Component({
  selector: 'app-gemini-api-key',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gemini-api-key.component.html',
  styleUrl: './gemini-api-key.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeminiApiKey {
  private chineseChessService = inject(ChineseChessService);

  apiKeyInput = '';

  hasApiKey = computed(() => this.chineseChessService.hasApiKey());
  onApiKeySaved = output<void>();
  onApiKeyClear = output<void>();

  constructor() {
    this.chineseChessService.updateApiKeyStatus();
  }

  saveApiKey(): void {
    if (!this.apiKeyInput.trim()) return;

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('gemini-api-key', this.apiKeyInput.trim());
      this.apiKeyInput = '';

      console.log('API Key saved, emitting onApiKeySaved event');

      // 同時使用兩種機制：output 事件和全域事件
      this.onApiKeySaved.emit();

      // 恢復原本的全域事件機制
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gemini_api_key_updated'));
      }

      // 更新統一的狀態
      this.chineseChessService.updateApiKeyStatus();
    }
  }

  clearApiKey(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('gemini-api-key');

      this.onApiKeyClear.emit();

      // 恢復原本的全域事件機制
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gemini_api_key_updated'));
      }

      // 更新統一的狀態
      this.chineseChessService.updateApiKeyStatus();
    }
  }

  maskedApiKey(): string {
    if (typeof localStorage !== 'undefined') {
      const key = localStorage.getItem('gemini-api-key');
      if (key) {
        return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
      }
    }
    return '';
  }

  static getApiKey(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('gemini-api-key');
    }
    return null;
  }
}
