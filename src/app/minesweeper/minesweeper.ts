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
    return getDifficultyConfigs(this.isMobile());
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
    // 設置設備類型到service
    this.minesweeperService.setDeviceType(this.isMobile());
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
   * 獲取格子顯示內容
   */
  protected getCellContent(x: number, y: number): string {
    const cell = this.gameState().board[x][y];

    if (cell.isFlagged) {
      return '🚩';
    }

    if (!cell.isRevealed) {
      return '';
    }

    if (cell.isMine) {
      return '💣';
    }

    if (cell.neighborMineCount > 0) {
      return cell.neighborMineCount.toString();
    }

    return '';
  }

  /**
   * 獲取格子CSS類別
   */
  protected getCellClass(x: number, y: number): string {
    const cell = this.gameState().board[x][y];
    const classes: string[] = ['cell'];

    if (cell.isRevealed) {
      classes.push('revealed');
      if (cell.isMine) {
        classes.push('mine');
      } else if (cell.neighborMineCount > 0) {
        classes.push(`number-${cell.neighborMineCount}`);
      }
    } else {
      classes.push('hidden');
    }

    if (cell.isFlagged) {
      classes.push('flagged');
    }

    return classes.join(' ');
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
   * 切換操作模式（僅手機版）
   */
  protected toggleGameMode(): void {
    if (this.isMobile()) {
      this.gameMode.set(this.gameMode() === 'dig' ? 'flag' : 'dig');
    }
  }
}
