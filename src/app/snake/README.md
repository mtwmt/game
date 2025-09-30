# Snake Game (貪食蛇遊戲)

## 概述

這是一個使用 Angular 20 和基於 Signal 的狀態管理實作的經典貪食蛇遊戲，完全符合 Angular 20 最佳實踐。

## 技術特色

- **Angular 20 最佳實踐**
  - 移除 Component 後綴的命名規範
  - OnPush 變更檢測策略
  - Signal-based 響應式狀態管理
  - 獨立元件架構

- **Clean Architecture**
  - 6 層架構：Interface → Config → Validation → Logic → Service → Component
  - 純函數設計，易於測試
  - 關注點分離，邏輯與 UI 解耦

- **SSR 支援**
  - 使用 `isPlatformBrowser` 進行平台檢測
  - 安全的瀏覽器 API 使用

## 專案結構

```
src/app/snake/
├── snake.ts                        # 主元件 (206 行，僅處理 UI 控制)
├── snake.html                      # 元件範本
├── snake.scss                      # 元件樣式
├── snake.interface.ts              # 型別定義
├── snake.service.ts                # 狀態管理服務 (220 行)
└── utils/
    ├── snake-config.ts             # 遊戲設定常數
    ├── snake-validation.ts         # 驗證邏輯 (純函數)
    └── snake-logic.ts              # 遊戲邏輯 (純函數)
```

## 架構設計模式

遵循統一的分層架構：

```
介面定義 → 配置 → 驗證 → 邏輯 → 服務 → 元件
```

### 分層職責

1. **Interface 層** - 型別定義和介面
2. **Config 層** - 遊戲配置和常數
3. **Validation 層** - 驗證邏輯（純函數）
4. **Logic 層** - 遊戲邏輯工具（純函數）
5. **Service 層** - 狀態管理和業務邏輯
6. **Component 層** - UI 控制和使用者互動

## 核心型別定義

### 基礎介面

```typescript
// 位置
interface Position {
  x: number;
  y: number;
}

// 方向
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

// 遊戲狀態
interface GameState {
  snake: Position[];      // 蛇的身體位置
  food: Position;         // 食物位置
  direction: Direction;   // 當前移動方向
  score: number;          // 分數
  gameStatus: GameStatus; // 遊戲狀態
  boardSize: number;      // 棋盤大小
}

// 移動結果
interface MoveResult {
  success: boolean;       // 移動是否成功
  ateFood: boolean;       // 是否吃到食物
  collision: boolean;     // 是否發生碰撞
  newSnake: Position[];   // 新的蛇身位置
}
```

### 遊戲狀態枚舉

```typescript
enum GameStatus {
  WAITING = 'waiting',    // 等待開始
  PLAYING = 'playing',    // 遊戲進行中
  PAUSED = 'paused',      // 暫停
  GAME_OVER = 'gameover'  // 遊戲結束
}
```

## 核心系統架構

### 1. 配置系統 (utils/snake-config.ts)

#### 遊戲配置

```typescript
export const GAME_CONFIG = {
  boardSize: 20,              // 棋盤大小 20x20
  gameSpeed: 150,             // 遊戲速度 (ms)
  initialSnakeLength: 1,      // 初始蛇身長度
  scorePerFood: 10,           // 每個食物的分數
  minSwipeDistance: 30,       // 最小滑動距離 (觸控控制)
} as const;

export const INITIAL_POSITIONS = {
  snake: { x: 10, y: 10 },    // 初始蛇頭位置
} as const;

export const OPPOSITE_DIRECTIONS: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
} as const;

export const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
  ArrowLeft: 'LEFT',
  ArrowRight: 'RIGHT',
} as const;

export const GAME_RULES: GameRule = {
  title: '貪食蛇規則',
  rules: [
    '使用方向鍵或觸控滑動控制蛇的移動方向',
    '吃到食物可以增加分數並讓蛇變長',
    '撞到牆壁或自己的身體會結束遊戲',
    '按空白鍵可以暫停或繼續遊戲',
    '遊戲結束後按空白鍵可以重新開始',
  ],
};

```

### 2. 驗證系統 (utils/snake-validation.ts)

提供純函數驗證方法：

**主要方法：**

- `isWithinBounds(position, boardSize)` - 檢查位置是否在棋盤內
- `isCollidingWithSnake(position, snake)` - 檢查是否與蛇身碰撞
- `checkCollision(head, snake, boardSize)` - 檢查是否發生碰撞
- `isEatingFood(head, food)` - 檢查是否吃到食物
- `isValidDirection(current, new)` - 檢查方向是否有效 (不能 180° 轉彎)
- `canMove(gameStatus)` - 檢查當前狀態是否可以移動
- `isGameOver(gameStatus)` - 檢查遊戲是否結束

**設計原則：**
- 所有方法都是靜態純函數
- 無副作用，易於測試
- 單一職責，每個函數只做一件事

### 3. 遊戲邏輯系統 (utils/snake-logic.ts)

提供遊戲核心邏輯工具：

**主要方法：**

- `getNextHeadPosition(head, direction)` - 計算下一個蛇頭位置
- `executeMove(snake, direction, food, boardSize)` - 執行移動並返回結果
- `generateFoodPosition(snake, boardSize)` - 生成新的食物位置
- `calculateScoreIncrement(ateFood)` - 計算分數增量
- `detectSwipeDirection(startPos, endPos, minDistance)` - 偵測滑動方向

**特殊處理：**

`generateFoodPosition` 使用兩階段演算法：
1. 隨機嘗試 (最多 100 次) - 快速找到空位
2. 掃描所有位置 (如果隨機失敗) - 保證找到空位

這個設計在棋盤幾乎滿時仍能正常運作，避免無限迴圈。

### 4. 遊戲服務 (snake.service.ts)

**職責**：集中管理遊戲狀態和業務邏輯

**核心功能：**

```typescript
@Injectable({ providedIn: 'root' })
export class SnakeService {
  // 遊戲狀態 Signal
  gameState = signal<GameState>({ ...initialGameState });

  // 公開 API
  initializeGame(): void      // 初始化遊戲
  startGame(): void           // 開始遊戲
  pauseGame(): void           // 暫停遊戲
  resumeGame(): void          // 繼續遊戲
  resetGame(): void           // 重置遊戲
  setDirection(dir): void     // 設定移動方向

  // 私有方法
  private moveSnake(): void   // 移動蛇 (每個 timer tick 執行)
  private startTimer(): void  // 啟動計時器
  private stopTimer(): void   // 停止計時器
}
```

**狀態更新流程：**

1. 使用者輸入 → `setDirection()`
2. Timer tick → `moveSnake()`
3. 執行移動邏輯 → `SnakeLogic.executeMove()`
4. 更新狀態 → `gameState.update()`
5. Component 自動重新渲染 (OnPush + Signals)

**SSR 支援：**
- 使用 `isPlatformBrowser` 檢測執行環境
- 只在瀏覽器中啟動計時器
- 確保服務端渲染不會出錯

### 5. UI 元件 (snake.ts)

**職責**：UI 控制和使用者互動

#### 核心職責
- 從 service 獲取 gameState signal
- 使用 computed 派生 UI 所需屬性
- 處理使用者互動事件
- 管理遊戲規則顯示

#### 關鍵方法
```typescript
class Snake {
  // 生命週期
  ngOnInit() {
    this.snakeService.initializeGame();
  }

  // 鍵盤控制
  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent)

  // 遊戲控制
  protected changeDirection(newDirection: Direction)
  protected togglePause()
  protected resetGame()

  // UI 工具
  protected getCellClass(x: number, y: number): string
}
```

#### Computed Properties
```typescript
protected readonly snake = computed(() => this.gameState().snake);
protected readonly food = computed(() => this.gameState().food);
protected readonly score = computed(() => this.gameState().score);
protected readonly gameOver = computed(() =>
  SnakeValidation.isGameOver(this.gameState().gameStatus)
);
```

所有顯示資料都從 `gameState` 自動衍生，確保 UI 與狀態同步。

## 控制方式

### 鍵盤控制

- **方向鍵 (↑↓←→)** - 控制蛇的移動方向
- **空白鍵** - 開始/暫停/繼續/重新開始

### 觸控控制

- **滑動** - 在棋盤上滑動控制方向
- **方向按鈕** - 點擊螢幕上的方向按鈕
- **功能按鈕** - 開始、暫停、重新開始

## 遊戲規則

1. 使用方向鍵或觸控滑動控制蛇的移動方向
2. 吃到食物可以增加分數並讓蛇變長
3. 撞到牆壁或自己的身體會結束遊戲
4. 按空白鍵可以暫停或繼續遊戲
5. 遊戲結束後按空白鍵可以重新開始

## 技術細節

### 效能優化

1. **OnPush 變更檢測** - 只在 Signal 變化時檢測
2. **Computed Signals** - 自動記憶化，避免重複計算
3. **純函數設計** - V8 引擎可以更好地優化
4. **單一 gameState Signal** - 減少變更檢測次數

### 測試友善

所有核心邏輯都是純函數，易於單元測試：

```typescript
// 範例：測試移動邏輯
const result = SnakeLogic.executeMove(
  [{ x: 10, y: 10 }],  // snake
  'UP',                // direction
  { x: 10, y: 8 },    // food
  20                   // boardSize
);
expect(result.success).toBe(true);
```

### 型別安全

- 使用 TypeScript 嚴格模式
- 所有公開 API 都有明確型別定義
- Direction 使用 string literal type
- GameStatus 使用 enum

## 與其他遊戲比較

| 特色 | Snake | Minesweeper | Pet Match | Chinese Chess |
|------|-------|-------------|-----------|---------------|
| 架構層級 | 6 層 | 6 層 | 6 層 | 7+ 層 |
| 使用 Service | ✅ | ✅ | ✅ | ✅ |
| Signal-based | ✅ | ✅ | ✅ | ✅ |
| OnPush | ✅ | ✅ | ✅ | ✅ |
| 純函數設計 | ✅ | ✅ | ✅ | ✅ |
| SSR 支援 | ✅ | ✅ | ✅ | ✅ |
| 元件大小 | 206 行 | ~250 行 | ~280 行 | ~400 行 |

## 開發歷程

### 重構前 (原始版本)

- 單一元件檔案 (290 行)
- 所有邏輯都在元件中
- 使用傳統 `@Input()` 裝飾器
- 沒有 OnPush 策略
- 測試困難

### 重構後 (Angular 20 版本)

- 6 個檔案，職責清晰
- 元件縮減至 206 行
- 服務管理狀態 (220 行)
- 純函數邏輯，易於測試
- 符合 Angular 20 所有最佳實踐

## 未來改進方向

- [ ] 加入難度級別 (調整速度)
- [ ] 加入最高分記錄 (LocalStorage)
- [ ] 加入音效
- [ ] 加入障礙物模式
- [ ] 單元測試覆蓋率 100%
- [ ] E2E 測試

## 參考資料

- [Angular 20 最佳實踐](https://angular.dev/best-practices)
- [Angular Signals 指南](https://angular.dev/guide/signals)
- [OnPush 變更檢測](https://angular.dev/best-practices/runtime-performance)
