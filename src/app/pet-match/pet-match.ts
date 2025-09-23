import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal, computed, PLATFORM_ID } from '@angular/core';
import { PathfindingService, Tile, Position, PathSegment } from './pathfinding.service';
import { GameLogicService, GameStats } from './game-logic.service';
import { RouterLink } from '@angular/router';

// 關卡類型枚舉
enum LevelType {
  CLASSIC = 'classic', // 第一關：不補位
  GRAVITY_DOWN = 'down', // 第二關：向下補位
  GRAVITY_UP = 'up', // 第三關：向上補位
  GRAVITY_LEFT = 'left', // 第四關：向左補位
  GRAVITY_RIGHT = 'right', // 第五關以後：向右補位
}

@Component({
  selector: 'app-pet-match',
  imports: [CommonModule, RouterLink],
  templateUrl: './pet-match.html',
})
export class PetMatch implements OnInit, OnDestroy {
  private pathfindingService = inject(PathfindingService);
  private gameLogicService = inject(GameLogicService);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  protected readonly boardWidth = 6;
  protected readonly boardHeight = 9;
  protected readonly petTypes = 12; // Number of different pet types

  protected readonly board = signal<(Tile | null)[][]>([]);
  protected readonly selectedTiles = signal<Tile[]>([]);
  protected readonly score = signal(0);
  protected readonly level = signal(1);
  protected readonly gameOver = signal(false);
  protected readonly levelComplete = signal(false);
  protected readonly gameComplete = signal(false); // 全部破關
  protected readonly matchPath = signal<PathSegment[]>([]);
  protected readonly showPath = signal(false);

  // 遊戲統計
  protected readonly moves = signal(0);
  protected readonly gameTime = signal(0);

  // 使用computed自動計算剩餘方塊數量
  protected readonly remainingTiles = computed(() =>
    this.gameLogicService.getRemainingTileCount(this.board())
  );

  // 使用computed自動計算格式化的遊戲時間
  protected readonly formattedTime = computed(() =>
    this.gameLogicService.formatTime(this.gameTime())
  );

  // 倒數計時系統 (5分鐘 = 300秒)
  protected readonly MAX_LEVEL_TIME = 300; // 每關限時5分鐘（常數）
  protected readonly countdownTime = signal(this.MAX_LEVEL_TIME); // 剩餘秒數
  // 格式化倒數時間
  protected readonly formattedCountdown = computed(() => {
    const seconds = this.countdownTime();
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  });
  protected readonly timeUp = computed(() => this.countdownTime() <= 0);
  // 計算時間線百分比
  protected readonly timelinePercentage = computed(
    () => (this.countdownTime() / this.MAX_LEVEL_TIME) * 100
  );

  protected readonly timelineColorClass = computed(() => {
    if (this.countdownTime() <= 30) return 'from-red-500 to-red-300';
    if (this.countdownTime() <= 60) return 'from-yellow-500 to-yellow-300';
    return 'from-lime-500 to-lime-300';
  });
  protected readonly timelineTextClass = computed(() => {
    if (this.countdownTime() <= this.MAX_LEVEL_TIME * 0.5) return 'text-white';
    return 'text-neutral-900/90';
  });

  // 道具系統 - 全遊戲累積，不重置
  protected readonly totalShufflesUsed = signal(0);
  protected readonly totalHintsUsed = signal(0);
  protected readonly maxShufflesPerGame = signal(5); // 整個遊戲共5次重排
  protected readonly maxHintsPerGame = signal(5); // 整個遊戲共5次提示

  // 計算剩餘道具數量
  protected readonly remainingShuffles = computed(
    () => this.maxShufflesPerGame() - this.totalShufflesUsed()
  );

  protected readonly remainingHints = computed(
    () => this.maxHintsPerGame() - this.totalHintsUsed()
  );

  // 提示功能
  protected readonly hintTiles = signal<Tile[]>([]); // 提示的兩個方塊
  protected readonly showHint = signal(false); // 是否顯示提示

  private animationTimeout?: NodeJS.Timeout;
  private gameStartTime = 0;
  private timeUpdateInterval?: NodeJS.Timeout;
  private countdownInterval?: NodeJS.Timeout;
  private levelStartTime = 0;

  // Pet emojis for visual representation
  protected readonly petEmojis = [
    '🐶',
    '🐱',
    '🐭',
    '🐹',
    '🐰',
    '🦊',
    '🐻',
    '🐼',
    '🐷',
    '🐸',
    '🐵',
    '🦋',
  ];

  ngOnInit() {
    this.initializeBoard();
  }

  ngOnDestroy() {
    this.clearAllTimers();
  }

  private clearAllTimers() {
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
    }
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  private initializeBoard() {
    const board = this.gameLogicService.initializeBoard(
      this.boardWidth,
      this.boardHeight,
      this.petTypes
    );
    this.board.set(board);
    this.startLevelTimer();
  }

  private startLevelTimer() {
    if (!this.isBrowser) return;

    this.clearAllTimers();

    this.levelStartTime = Date.now();
    this.countdownTime.set(this.MAX_LEVEL_TIME);

    // 經過時間計時器
    this.timeUpdateInterval = setInterval(() => {
      const elapsed = this.gameLogicService.getElapsedTime(this.levelStartTime);
      this.gameTime.set(elapsed);
    }, 1000);

    // 倒數計時器
    this.countdownInterval = setInterval(() => {
      const elapsed = this.gameLogicService.getElapsedTime(this.levelStartTime);
      const remaining = Math.max(0, this.MAX_LEVEL_TIME - elapsed);
      this.countdownTime.set(remaining);

      // 時間到了
      if (remaining <= 0) {
        this.handleTimeUp();
      }
    }, 1000);
  }

  private handleTimeUp() {
    // 避免重複執行
    if (this.gameOver()) return;

    this.clearAllTimers();
    this.gameOver.set(true);
  }

  // 取得當前關卡類型
  private getCurrentLevelType(): LevelType {
    const level = this.level();
    if (level === 1) return LevelType.CLASSIC;
    if (level === 2) return LevelType.GRAVITY_DOWN;
    if (level === 3) return LevelType.GRAVITY_UP;
    if (level === 4) return LevelType.GRAVITY_LEFT;
    return LevelType.GRAVITY_RIGHT; // 第五關以後
  }

  // 根據關卡類型應用重力效果
  private applyLevelGravity(board: (Tile | null)[][]): void {
    const levelType = this.getCurrentLevelType();

    switch (levelType) {
      case LevelType.CLASSIC:
        // 第一關：不補位
        break;
      case LevelType.GRAVITY_DOWN:
        this.gameLogicService.collapseBoardDown(board, this.boardWidth, this.boardHeight);
        break;
      case LevelType.GRAVITY_UP:
        this.gameLogicService.collapseBoardUp(board, this.boardWidth, this.boardHeight);
        break;
      case LevelType.GRAVITY_LEFT:
        this.gameLogicService.collapseBoardLeft(board, this.boardWidth, this.boardHeight);
        break;
      case LevelType.GRAVITY_RIGHT:
        this.gameLogicService.collapseBoardRight(board, this.boardWidth, this.boardHeight);
        break;
    }
  }

  protected onTileClick(tile: Tile | null) {
    if (!tile || this.gameOver() || this.showPath()) return;

    const selected = this.selectedTiles();

    // If tile is already selected, deselect it
    if (tile.selected) {
      tile.selected = false;
      this.selectedTiles.set(selected.filter((t) => t.id !== tile.id));
      return;
    }

    // If two tiles already selected, clear selection
    if (selected.length >= 2) {
      this.clearSelection();
    }

    // Select the tile
    tile.selected = true;
    const newSelected = [...selected, tile];
    this.selectedTiles.set(newSelected);

    // Check for match if two tiles selected
    if (newSelected.length === 2) {
      this.checkMatch(newSelected[0], newSelected[1]);
    }
  }

  private checkMatch(tile1: Tile, tile2: Tile) {
    // Check if pets are the same type
    if (tile1.petType !== tile2.petType) {
      // Different types, clear selection after short delay
      if (this.isBrowser) {
        setTimeout(() => this.clearSelection(), 300);
      } else {
        this.clearSelection();
      }
      return;
    }

    // 增加移動次數
    this.moves.update((m) => m + 1);

    // Find path between tiles
    const path = this.pathfindingService.findPath(
      tile1.position,
      tile2.position,
      this.board(),
      this.boardWidth,
      this.boardHeight
    );

    // 調試信息：在開發環境中顯示配對詳情
    if (this.isBrowser && !path) {
      console.log(
        `配對失敗: 寵物${this.petEmojis[tile1.petType]} (${tile1.position.x},${
          tile1.position.y
        }) → (${tile2.position.x},${tile2.position.y}) 無法找到路徑`
      );
    }

    if (path) {
      // Valid match found
      this.matchPath.set(path);
      this.showPath.set(true);

      // Show path animation, then remove tiles
      const executeRemoval = () => {
        const currentBoard = this.board();
        this.gameLogicService.removeTiles(currentBoard, tile1, tile2);

        // 根據關卡類型應用不同的重力效果
        this.applyLevelGravity(currentBoard);

        // 更新棋盤信號 (重要！)
        this.board.set([...currentBoard]);

        this.score.update((s) => s + 10);
        this.showPath.set(false);
        this.matchPath.set([]);
        this.clearSelection();
        this.checkGameOver();
      };

      if (this.isBrowser) {
        this.animationTimeout = setTimeout(executeRemoval, 200);
      } else {
        executeRemoval();
      }
    } else {
      // No valid path, clear selection
      if (this.isBrowser) {
        setTimeout(() => this.clearSelection(), 300);
      } else {
        this.clearSelection();
      }
    }
  }

  private clearSelection() {
    const selected = this.selectedTiles();
    selected.forEach((tile) => (tile.selected = false));
    this.selectedTiles.set([]);
  }

  private checkGameOver() {
    const board = this.board();

    // 檢查是否已完成
    if (this.gameLogicService.isGameComplete(board)) {
      this.levelComplete.set(true);
      this.clearAllTimers();

      // 檢查是否為第五關，如果是則全破關
      if (this.level() >= 5) {
        this.gameComplete.set(true);
      }
      return;
    }

    // 檢查是否還有有效移動
    if (
      !this.gameLogicService.hasValidMoves(
        board,
        this.boardWidth,
        this.boardHeight,
        this.pathfindingService
      )
    ) {
      // 如果沒有有效移動，但還有剩餘方塊且還有重排次數，自動重排
      if (this.remainingTiles() > 0 && this.canUseShuffle()) {
        console.log('自動觸發重排：無可用移動但還有剩餘方塊');
        this.shuffleTiles();
      } else {
        // 否則遊戲結束
        this.gameOver.set(true);
        this.stopTimer();
      }
    }
  }

  private stopTimer() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = undefined;
    }
  }

  protected nextLevel() {
    // 如果已經全破關，不執行下一關
    if (this.gameComplete()) {
      return;
    }

    this.level.update((l) => l + 1);
    this.levelComplete.set(false);
    this.clearSelection();
    this.showPath.set(false);
    this.matchPath.set([]);
    this.hideHint(); // 隱藏提示
    // 注意：道具次數不重置，延續到下一關
    this.clearAllTimers();
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
    }
    this.initializeBoard();
  }

  protected resetGame() {
    this.score.set(0);
    this.level.set(1);
    this.moves.set(0);
    this.gameTime.set(0);
    // 重置整個遊戲時，道具次數重置
    this.totalShufflesUsed.set(0);
    this.totalHintsUsed.set(0);
    this.hideHint(); // 隱藏提示
    this.gameOver.set(false);
    this.levelComplete.set(false);
    this.gameComplete.set(false);
    this.clearSelection();
    this.showPath.set(false);
    this.matchPath.set([]);
    this.clearAllTimers();
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
    }
    this.initializeBoard();
  }

  protected getTileClass(tile: Tile | null): string {
    if (!tile) return 'bg-stone-800 border border-stone-700';

    const baseClass =
      'bg-gradient-to-br border-2 cursor-pointer flex items-center justify-center text-2xl';

    if (tile.selected) {
      return `${baseClass} from-yellow-400 to-yellow-600 border-yellow-300 brightness-125`;
    }

    // 提示方塊的特殊效果
    if (this.isHintTile(tile)) {
      return `${baseClass} from-green-400 to-green-600 border-green-300 animate-pulse ring-2 ring-green-400 ring-opacity-75`;
    }

    // Different colors for different pet types
    const colors = [
      'from-blue-400 to-blue-600 border-blue-300', // 🐶 Dog
      'from-pink-400 to-pink-600 border-pink-300', // 🐱 Cat
      'from-gray-400 to-gray-600 border-gray-300', // 🐭 Mouse
      'from-yellow-400 to-yellow-600 border-yellow-300', // 🐹 Hamster
      'from-purple-400 to-purple-600 border-purple-300', // 🐰 Rabbit
      'from-orange-400 to-orange-600 border-orange-300', // 🦊 Fox
      'from-amber-600 to-amber-800 border-amber-400', // 🐻 Bear
      'from-slate-400 to-slate-600 border-slate-300', // 🐼 Panda
      'from-rose-400 to-rose-600 border-rose-300', // 🐷 Pig
      'from-green-400 to-green-600 border-green-300', // 🐸 Frog
      'from-teal-400 to-teal-600 border-teal-300', // 🐵 Monkey
      'from-violet-400 to-violet-600 border-violet-300', // 🦋 Butterfly
    ];

    return `${baseClass} ${colors[tile.petType] || colors[0]}`;
  }

  protected getPathStyle(segment: PathSegment): any {
    const cellSize = 48; // Approximate cell size in pixels
    const gap = 2; // Gap between cells

    const startX = segment.start.x * (cellSize + gap);
    const startY = segment.start.y * (cellSize + gap);
    const endX = segment.end.x * (cellSize + gap);
    const endY = segment.end.y * (cellSize + gap);

    if (segment.direction === 'horizontal') {
      const left = Math.min(startX, endX) + cellSize / 2;
      const width = Math.abs(endX - startX);
      const top = startY + cellSize / 2 - 1;

      return {
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: '2px',
        background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
        boxShadow: '0 0 8px #fbbf24, 0 0 8px #f59e0b',
        zIndex: 10,
      };
    } else {
      const top = Math.min(startY, endY) + cellSize / 2;
      const height = Math.abs(endY - startY);
      const left = startX + cellSize / 2 - 1;

      return {
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        width: '2px',
        height: `${height}px`,
        background: 'linear-gradient(180deg, #fbbf24, #f59e0b)',
        boxShadow: '0 0 8px #fbbf24, 0 0 16px #f59e0b',
        zIndex: 10,
      };
    }
  }

  // 重排功能
  protected shuffleTiles() {
    if (
      !this.canUseShuffle() ||
      this.gameOver() ||
      this.levelComplete() ||
      this.remainingTiles() === 0
    ) {
      return;
    }

    // 清除當前選擇
    this.clearSelection();

    // 收集所有非空方塊的寵物類型
    const board = this.board();
    const petTypes: number[] = [];

    for (let y = 0; y < this.boardHeight; y++) {
      for (let x = 0; x < this.boardWidth; x++) {
        if (board[y][x]) {
          petTypes.push(board[y][x]!.petType);
        }
      }
    }

    // 洗牌寵物類型
    for (let i = petTypes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [petTypes[i], petTypes[j]] = [petTypes[j], petTypes[i]];
    }

    // 重新分配給非空位置
    let petIndex = 0;
    let id = Date.now(); // 使用時間戳作為新的ID起點

    for (let y = 0; y < this.boardHeight; y++) {
      for (let x = 0; x < this.boardWidth; x++) {
        if (board[y][x]) {
          board[y][x] = {
            id: id++,
            petType: petTypes[petIndex++],
            position: { x, y },
            selected: false,
          };
        }
      }
    }

    // 更新棋盤信號
    this.board.set([...board]);

    // 增加重排使用次數
    this.totalShufflesUsed.update((count) => count + 1);

    // 重排後重新檢查遊戲狀態
    this.checkGameOver();
  }

  // 檢查是否還有可用移動
  protected hasAvailableMoves(): boolean {
    return this.gameLogicService.hasValidMoves(
      this.board(),
      this.boardWidth,
      this.boardHeight,
      this.pathfindingService
    );
  }

  // 檢查是否可以使用重排
  protected canUseShuffle(): boolean {
    return (
      this.remainingShuffles() > 0 &&
      !this.gameOver() &&
      !this.levelComplete() &&
      !this.timeUp() &&
      this.remainingTiles() > 0
    );
  }

  // 提示功能相關方法
  protected useHint(): void {
    if (!this.canUseHint()) return;

    // 清除當前選擇
    this.clearSelection();

    // 尋找一個有效的配對
    const hintPair = this.findValidPair();
    if (hintPair) {
      this.hintTiles.set([hintPair.tile1, hintPair.tile2]);
      this.showHint.set(true);
      this.totalHintsUsed.update((count) => count + 1);

      // 3秒後自動隱藏提示
      if (this.isBrowser) {
        setTimeout(() => this.hideHint(), 3000);
      }
    }
  }

  protected hideHint(): void {
    this.showHint.set(false);
    this.hintTiles.set([]);
  }

  protected canUseHint(): boolean {
    return (
      this.remainingHints() > 0 &&
      !this.gameOver() &&
      !this.levelComplete() &&
      !this.timeUp() &&
      !this.showHint() &&
      this.remainingTiles() > 0
    );
  }

  private findValidPair(): { tile1: Tile; tile2: Tile } | null {
    const board = this.board();

    // 遍歷所有方塊尋找有效配對
    for (let y1 = 0; y1 < this.boardHeight; y1++) {
      for (let x1 = 0; x1 < this.boardWidth; x1++) {
        const tile1 = board[y1][x1];
        if (!tile1) continue;

        // 尋找相同類型的其他方塊
        for (let y2 = 0; y2 < this.boardHeight; y2++) {
          for (let x2 = 0; x2 < this.boardWidth; x2++) {
            const tile2 = board[y2][x2];
            if (!tile2 || tile1.id === tile2.id) continue;

            // 檢查是否為相同類型且有連通路徑
            if (tile1.petType === tile2.petType) {
              const path = this.pathfindingService.findPath(
                tile1.position,
                tile2.position,
                board,
                this.boardWidth,
                this.boardHeight
              );

              if (path) {
                return { tile1, tile2 };
              }
            }
          }
        }
      }
    }

    return null;
  }

  // 檢查方塊是否為提示方塊
  protected isHintTile(tile: Tile | null): boolean {
    if (!tile || !this.showHint()) return false;
    return this.hintTiles().some((hintTile) => hintTile.id === tile.id);
  }
}
