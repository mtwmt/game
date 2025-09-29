import { Component, inject, OnDestroy, OnInit, computed, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameHeaderComponent } from '../shared/components/game-header/game-header';
import { ModalComponent } from '../shared/components/modal/modal.component';
import { MinesweeperService } from './minesweeper.service';
import {
  Position,
  GameStatus,
  Difficulty,
  GameRule,
} from './minesweeper.interface';
import { getDifficultyConfigs } from './utils/minesweeper-config';

@Component({
  selector: 'app-minesweeper',
  standalone: true,
  imports: [CommonModule, FormsModule, GameHeaderComponent, ModalComponent],
  templateUrl: './minesweeper.html',
})
export class MinesweeperComponent implements OnInit, OnDestroy {
  private minesweeperService = inject(MinesweeperService);
  private platformId = inject(PLATFORM_ID);

  // 計算屬性
  protected readonly gameState = this.minesweeperService.gameState;
  protected readonly GameStatus = GameStatus;
  protected readonly Difficulty = Difficulty;

  // 動態難度配置
  protected readonly difficultyConfigs = computed(() => {
    return getDifficultyConfigs(this.isMobile(), this.getScreenWidth(), this.getScreenHeight());
  });

  // 下拉選單控制
  protected isDropdownOpen = signal(false);

  // 設備類型檢測
  protected readonly isMobile = signal(this.checkIsMobile());

  // 手機版操作模式：挖掘或標旗
  protected gameMode = signal<'dig' | 'flag'>('dig');

  // 遊戲規則 - 根據設備類型動態生成
  protected readonly gameRules = computed<GameRule>(() => {
    const baseRules = [
      '點擊格子來揭開它們，避免點到地雷',
      '數字表示該格子周圍8格中地雷的數量',
    ];

    const controlRules = this.isMobile()
      ? [
          '使用挖掘🔨和標旗🚩按鈕切換操作模式',
          '挖掘模式：點擊揭開格子',
          '標旗模式：點擊標記/取消標記地雷',
        ]
      : [
          '左鍵點擊揭開格子',
          '右鍵點擊標記/取消標記地雷',
        ];

    const endRules = [
      '揭開所有非地雷格子即可獲勝',
      '點到地雷就會失敗',
      '第一次點擊保證不會踩到地雷',
      '旗標數量不能超過地雷總數',
    ];

    return {
      title: '踩地雷遊戲規則',
      rules: [...baseRules, ...controlRules, ...endRules],
    };
  });

  // 計算剩餘地雷數
  protected readonly remainingMines = computed(() => {
    return this.minesweeperService.getRemainingMineCount();
  });

  // 計算遊戲時間格式化
  protected readonly formattedTime = computed(() => {
    const time = this.gameState().gameTime;
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  });

  // 計算所有格子的顯示內容（效能優化）
  protected readonly cellContents = computed(() => {
    const board = this.gameState().board;
    return board.map(row =>
      row.map(cell => {
        if (cell.isFlagged) return '🚩';
        if (!cell.isRevealed) return '';
        if (cell.isMine) return '💣';
        if (cell.neighborMineCount > 0) return cell.neighborMineCount.toString();
        return '';
      })
    );
  });

  // 計算所有格子的樣式類別（效能優化）
  protected readonly cellClasses = computed(() => {
    const board = this.gameState().board;
    const mobile = this.isMobile();

    return board.map(row =>
      row.map(cell => {
        const classes: Record<string, boolean> = {
          'w-8 h-8 text-sm': mobile,
          'w-5 h-5 text-xs': !mobile,
          'bg-neutral-50 hover:bg-neutral-100': !cell.isRevealed && !cell.isFlagged,
          'bg-neutral-300': cell.isRevealed && !cell.isMine,
          'bg-red-500 text-white': cell.isRevealed && cell.isMine,
          'bg-yellow-300': cell.isFlagged,
          'text-blue-600': cell.isRevealed && cell.neighborMineCount === 1,
          'text-green-600': cell.isRevealed && cell.neighborMineCount === 2,
          'text-red-600': cell.isRevealed && cell.neighborMineCount === 3,
          'text-purple-600': cell.isRevealed && cell.neighborMineCount === 4,
          'text-yellow-600': cell.isRevealed && cell.neighborMineCount === 5,
          'text-pink-600': cell.isRevealed && cell.neighborMineCount === 6,
          'text-black': cell.isRevealed && cell.neighborMineCount === 7,
          'text-neutral-600': cell.isRevealed && cell.neighborMineCount === 8
        };
        return classes;
      })
    );
  });

  // 計算遊戲狀態文字
  protected readonly gameStatusText = computed(() => {
    const status = this.gameState().gameStatus;
    switch (status) {
      case GameStatus.WAITING:
        return '點擊開始遊戲';
      case GameStatus.PLAYING:
        return '遊戲進行中';
      case GameStatus.WON:
        return '🎉 恭喜獲勝！';
      case GameStatus.LOST:
        return '💥 遊戲失敗';
      default:
        return '';
    }
  });

  ngOnInit(): void {
    // 設置設備類型和螢幕尺寸到service
    this.minesweeperService.setDeviceType(this.isMobile(), this.getScreenWidth(), this.getScreenHeight());
    this.minesweeperService.initializeGame();

    // 只在瀏覽器環境中設置點擊監聽器
    if (isPlatformBrowser(this.platformId)) {
      // 點擊外部關閉下拉選單
      document.addEventListener('click', (event) => {
        const target = event.target as Element;
        if (!target.closest('.dropdown-container') && this.isDropdownOpen()) {
          this.closeDropdown();
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.minesweeperService.cleanup();
  }

  /**
   * 處理格子點擊
   */
  protected onCellClick(position: Position): void {
    const cell = this.gameState().board[position.y][position.x];

    if (this.isMobile()) {
      // 手機版：根據當前模式執行操作
      if (this.gameMode() === 'dig') {
        this.minesweeperService.revealCell(position);
      } else {
        this.minesweeperService.toggleFlag(position);
      }
    } else {
      // PC版：左鍵揭開格子
      this.minesweeperService.revealCell(position);
    }
  }

  /**
   * 處理右鍵點擊（標記/取消標記）- 僅PC版
   */
  protected onCellRightClick(event: MouseEvent, position: Position): void {
    event.preventDefault();
    if (!this.isMobile()) {
      this.minesweeperService.toggleFlag(position);
    }
  }


  /**
   * 設置難度
   */
  protected setDifficulty(difficulty: Difficulty): void {
    this.minesweeperService.setDifficulty(difficulty);
  }

  /**
   * 切換下拉選單開關
   */
  protected toggleDropdown(): void {
    this.isDropdownOpen.set(!this.isDropdownOpen());
  }

  /**
   * 關閉下拉選單
   */
  protected closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }

  /**
   * 選擇難度並關閉下拉選單
   */
  protected selectDifficulty(difficulty: Difficulty): void {
    this.setDifficulty(difficulty);
    this.closeDropdown();
  }

  /**
   * 重新開始遊戲
   */
  protected resetGame(): void {
    this.minesweeperService.resetGame();
  }


  /**
   * 獲取難度配置名稱
   */
  protected getDifficultyName(difficulty: Difficulty): string {
    return this.difficultyConfigs()[difficulty].name;
  }

  /**
   * 檢查是否為當前難度
   */
  protected isCurrentDifficulty(difficulty: Difficulty): boolean {
    return this.gameState().difficulty === difficulty;
  }

  /**
   * 計算遊戲進度百分比
   */
  protected getProgressPercentage(): number {
    const state = this.gameState();
    const totalNonMineCells = state.width * state.height - state.mineCount;
    if (totalNonMineCells === 0) return 0;
    return Math.round((state.revealedCount / totalNonMineCells) * 100);
  }

  // 時間線相關計算屬性
  protected readonly timelinePercentage = computed(() => {
    const gameTime = this.gameState().gameTime;
    const maxTime = 999; // 最大顯示時間 16:39
    return Math.min((gameTime / maxTime) * 100, 100);
  });

  protected readonly timelineColorClass = computed(() => {
    const gameTime = this.gameState().gameTime;
    if (gameTime >= 600) return 'from-red-500 to-red-300'; // 10分鐘以上
    if (gameTime >= 300) return 'from-yellow-500 to-yellow-300'; // 5-10分鐘
    return 'from-lime-500 to-lime-300'; // 5分鐘以下
  });

  protected readonly timelineTextClass = computed(() => {
    const gameTime = this.gameState().gameTime;
    return gameTime >= 300 ? 'text-neutral-900/90' : 'text-white';
  });

  // 計算小地圖格子尺寸（適合在彈窗中顯示完整棋盤）
  protected readonly miniMapCellSize = computed(() => {
    const width = this.gameState().width;
    const height = this.gameState().height;
    const maxWidth = 280; // 彈窗內最大寬度
    const maxHeight = 200; // 彈窗內最大高度

    const cellWidth = Math.floor(maxWidth / width);
    const cellHeight = Math.floor(maxHeight / height);

    // 取最小值確保整個棋盤能顯示，最小 4px
    return Math.max(4, Math.min(cellWidth, cellHeight, 12));
  });

  /**
   * 檢測是否為手機設備
   */
  private checkIsMobile(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth < 768;
  }

  /**
   * 獲取螢幕寬度
   */
  private getScreenWidth(): number {
    if (!isPlatformBrowser(this.platformId)) {
      return 0;
    }
    return window.innerWidth;
  }

  /**
   * 獲取螢幕高度
   */
  private getScreenHeight(): number {
    if (!isPlatformBrowser(this.platformId)) {
      return 0;
    }
    return window.innerHeight;
  }

  /**
   * 切換操作模式（僅手機版）
   */
  protected toggleGameMode(): void {
    if (this.isMobile()) {
      this.gameMode.set(this.gameMode() === 'dig' ? 'flag' : 'dig');
    }
  }

  /**
   * 獲取 X 軸索引陣列（用於渲染）
   */
  protected getXIndices(): number[] {
    return Array.from({ length: this.gameState().width }, (_, i) => i);
  }

  /**
   * 獲取 Y 軸索引陣列（用於渲染）
   */
  protected getYIndices(): number[] {
    return Array.from({ length: this.gameState().height }, (_, i) => i);
  }
}
