import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, signal } from '@angular/core';
import { GameHeaderComponent, GameRule } from '../shared/components/game-header/game-header';
import { ModalComponent } from '../shared/components/modal/modal.component';

interface Position {
  x: number;
  y: number;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

@Component({
  selector: 'app-snake',
  imports: [CommonModule, GameHeaderComponent, ModalComponent],
  templateUrl: './snake.html',
})
export class Snake implements OnInit, OnDestroy {
  protected readonly boardSize = 20;
  protected readonly snake = signal<Position[]>([{ x: 10, y: 10 }]);
  protected readonly food = signal<Position>({ x: 5, y: 5 });
  protected readonly direction = signal<Direction>('RIGHT');
  protected readonly score = signal(0);
  protected readonly gameOver = signal(false);
  protected readonly gameStarted = signal(false);
  protected readonly isPaused = signal(false);

  // 遊戲規則定義
  protected readonly gameRules: GameRule = {
    title: '貪食蛇遊戲規則',
    rules: [
      '使用方向鍵 (↑↓←→) 或觸控滑動控制蛇的移動方向',
      '吃到紅色食物可以增加分數並讓蛇身變長',
      '避免撞到邊界牆壁或蛇身本體，否則遊戲結束',
      '按空白鍵可以暫停/繼續遊戲',
      '遊戲目標是獲得最高分數，挑戰自己的極限',
      '蛇移動速度固定，需要提前預判路線'
    ]
  };

  private gameLoop?: NodeJS.Timeout;
  private readonly gameSpeed = 150;
  private touchStartX = 0;
  private touchStartY = 0;
  private readonly minSwipeDistance = 30;

  ngOnInit() {
    this.generateFood();
  }

  ngOnDestroy() {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent) {
    if (!this.gameStarted() && event.key === ' ') {
      this.startGame();
      return;
    }

    if (this.gameOver() && event.key === ' ') {
      this.resetGame();
      return;
    }

    if (this.gameStarted() && !this.gameOver() && event.key === ' ') {
      this.togglePause();
      return;
    }

    if (!this.gameStarted() || this.gameOver() || this.isPaused()) return;

    const currentDirection = this.direction();

    switch (event.key) {
      case 'ArrowUp':
        if (currentDirection !== 'DOWN') this.direction.set('UP');
        break;
      case 'ArrowDown':
        if (currentDirection !== 'UP') this.direction.set('DOWN');
        break;
      case 'ArrowLeft':
        if (currentDirection !== 'RIGHT') this.direction.set('LEFT');
        break;
      case 'ArrowRight':
        if (currentDirection !== 'LEFT') this.direction.set('RIGHT');
        break;
    }
  }

  protected startGame() {
    this.gameStarted.set(true);
    this.gameLoop = setInterval(() => this.moveSnake(), this.gameSpeed);
  }

  protected resetGame() {
    this.snake.set([{ x: 10, y: 10 }]);
    this.direction.set('RIGHT');
    this.score.set(0);
    this.gameOver.set(false);
    this.gameStarted.set(false);
    this.isPaused.set(false);
    this.generateFood();

    if (this.gameLoop) {
      clearInterval(this.gameLoop);
    }
  }

  protected togglePause() {
    if (this.isPaused()) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }

  protected pauseGame() {
    this.isPaused.set(true);
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = undefined;
    }
  }

  protected resumeGame() {
    this.isPaused.set(false);
    if (this.gameStarted() && !this.gameOver()) {
      this.gameLoop = setInterval(() => this.moveSnake(), this.gameSpeed);
    }
  }

  private moveSnake() {
    const currentSnake = this.snake();
    const head = { ...currentSnake[0] };

    switch (this.direction()) {
      case 'UP':
        head.y--;
        break;
      case 'DOWN':
        head.y++;
        break;
      case 'LEFT':
        head.x--;
        break;
      case 'RIGHT':
        head.x++;
        break;
    }

    if (this.checkCollision(head)) {
      this.endGame();
      return;
    }

    const newSnake = [head, ...currentSnake];

    if (head.x === this.food().x && head.y === this.food().y) {
      this.score.update((score) => score + 10);
      this.generateFood();
    } else {
      newSnake.pop();
    }

    this.snake.set(newSnake);
  }

  private checkCollision(head: Position): boolean {
    if (head.x < 0 || head.x >= this.boardSize || head.y < 0 || head.y >= this.boardSize) {
      return true;
    }

    return this.snake().some((segment) => segment.x === head.x && segment.y === head.y);
  }

  private generateFood() {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * this.boardSize),
        y: Math.floor(Math.random() * this.boardSize),
      };
    } while (this.snake().some((segment) => segment.x === newFood.x && segment.y === newFood.y));

    this.food.set(newFood);
  }

  private endGame() {
    this.gameOver.set(true);
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
    }
  }

  protected getCellClass(x: number, y: number): string {
    const isSnakeHead =
      this.snake().length > 0 && this.snake()[0].x === x && this.snake()[0].y === y;
    const isSnakeBody = this.snake().some((segment) => segment.x === x && segment.y === y);
    const isFood = this.food().x === x && this.food().y === y;
    const isEmpty = !isSnakeHead && !isSnakeBody && !isFood;

    if (isSnakeHead) return 'bg-lime-400 border border-lime-600 ';
    if (isSnakeBody) return 'bg-lime-600 border border-lime-500';
    if (isFood) return 'bg-fuchsia-500 shadow-[0_0_6px_#c026d3,0_0_12px_#c026d3] animate-pulse';
    if (isEmpty) return 'bg-lime-900';
    return '';
  }

  protected getBoard(): number[] {
    return Array(this.boardSize * this.boardSize)
      .fill(0)
      .map((_, i) => i);
  }

  protected getRow(index: number): number {
    return Math.floor(index / this.boardSize);
  }

  protected getCol(index: number): number {
    return index % this.boardSize;
  }

  // Touch control methods
  protected onTouchStart(event: TouchEvent) {
    event.preventDefault();
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  }

  protected onTouchMove(event: TouchEvent) {
    event.preventDefault();
  }

  protected onTouchEnd(event: TouchEvent) {
    if (!this.gameStarted() || this.gameOver() || this.isPaused()) return;

    event.preventDefault();
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Check if swipe distance is sufficient
    if (Math.max(absDeltaX, absDeltaY) < this.minSwipeDistance) return;

    const currentDirection = this.direction();

    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (deltaX > 0 && currentDirection !== 'LEFT') {
        this.direction.set('RIGHT');
      } else if (deltaX < 0 && currentDirection !== 'RIGHT') {
        this.direction.set('LEFT');
      }
    } else {
      // Vertical swipe
      if (deltaY > 0 && currentDirection !== 'UP') {
        this.direction.set('DOWN');
      } else if (deltaY < 0 && currentDirection !== 'DOWN') {
        this.direction.set('UP');
      }
    }
  }

  // Button control method
  protected changeDirection(newDirection: Direction) {
    if (!this.gameStarted() || this.gameOver() || this.isPaused()) return;

    const currentDirection = this.direction();

    // Prevent opposite direction
    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN',
      DOWN: 'UP',
      LEFT: 'RIGHT',
      RIGHT: 'LEFT',
    };

    if (opposites[currentDirection] !== newDirection) {
      this.direction.set(newDirection);
    }
  }
}
