import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { PathfindingService, Tile, Position, PathSegment } from './pathfinding.service';
import { GameLogicService, GameStats } from './game-logic.service';

@Component({
  selector: 'app-pet-match',
  imports: [CommonModule],
  templateUrl: './pet-match.html',
})
export class PetMatch implements OnInit, OnDestroy {
  private pathfindingService = inject(PathfindingService);
  private gameLogicService = inject(GameLogicService);

  protected readonly boardWidth = 6;
  protected readonly boardHeight = 4;
  protected readonly petTypes = 12; // Number of different pet types

  protected readonly board = signal<(Tile | null)[][]>([]);
  protected readonly selectedTiles = signal<Tile[]>([]);
  protected readonly score = signal(0);
  protected readonly level = signal(1);
  protected readonly gameOver = signal(false);
  protected readonly levelComplete = signal(false);
  protected readonly matchPath = signal<PathSegment[]>([]);
  protected readonly showPath = signal(false);

  // 新增遊戲統計
  protected readonly moves = signal(0);
  protected readonly gameTime = signal(0);
  protected readonly remainingTiles = signal(0);
  protected readonly formattedTime = signal('00:00');

  private animationTimeout?: NodeJS.Timeout;
  private gameStartTime = 0;
  private timeUpdateInterval?: NodeJS.Timeout;

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
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
    }
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
  }

  private initializeBoard() {
    const board = this.gameLogicService.initializeBoard(
      this.boardWidth,
      this.boardHeight,
      this.petTypes
    );
    this.board.set(board);
    this.updateGameStats();
    this.startTimer();
  }

  private startTimer() {
    this.gameStartTime = Date.now();
    this.timeUpdateInterval = setInterval(() => {
      const elapsed = this.gameLogicService.getElapsedTime(this.gameStartTime);
      this.gameTime.set(elapsed);
      this.formattedTime.set(this.gameLogicService.formatTime(elapsed));
    }, 1000);
  }

  private updateGameStats() {
    const remaining = this.gameLogicService.getRemainingTileCount(this.board());
    this.remainingTiles.set(remaining);
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
      setTimeout(() => this.clearSelection(), 500);
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
    if (path) {
      // Valid match found
      this.matchPath.set(path);
      this.showPath.set(true);

      // Show path animation, then remove tiles
      this.animationTimeout = setTimeout(() => {
        const currentBoard = this.board();
        this.gameLogicService.removeTiles(currentBoard, tile1, tile2);

        // 【關卡差異邏輯】第一關與第二關以後的不同行為
        // 第一關：消除後空白不補位，保持原有連連看玩法
        // 第二關以後：消除後空白往下補位，增加策略難度
        if (this.level() >= 2) {
          this.gameLogicService.collapseBoard(currentBoard, this.boardWidth, this.boardHeight);
        }

        // 更新棋盤信號 (重要！)
        this.board.set([...currentBoard]);

        this.score.update((s) => s + 10);
        this.showPath.set(false);
        this.matchPath.set([]);
        this.clearSelection();
        this.updateGameStats();
        this.checkGameOver();
      }, 800);
    } else {
      // No valid path, clear selection
      setTimeout(() => this.clearSelection(), 500);
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
      this.stopTimer();
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
      this.gameOver.set(true);
      this.stopTimer();
    }
  }

  private stopTimer() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = undefined;
    }
  }

  protected nextLevel() {
    this.level.update((l) => l + 1);
    this.levelComplete.set(false);
    this.clearSelection();
    this.showPath.set(false);
    this.matchPath.set([]);
    this.stopTimer();
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
    this.formattedTime.set('00:00');
    this.gameOver.set(false);
    this.levelComplete.set(false);
    this.clearSelection();
    this.showPath.set(false);
    this.matchPath.set([]);
    this.stopTimer();
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
    }
    this.initializeBoard();
  }

  protected getTileClass(tile: Tile | null): string {
    if (!tile) return 'bg-stone-800 border border-stone-700';

    const baseClass =
      'bg-gradient-to-br border-2 cursor-pointer transition-all duration-200 flex items-center justify-center text-2xl hover:scale-105';

    if (tile.selected) {
      return `${baseClass} from-yellow-400 to-yellow-600 border-yellow-300 scale-110 shadow-lg shadow-yellow-400/50`;
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
        boxShadow: '0 0 8px #fbbf24, 0 0 16px #f59e0b',
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
}
