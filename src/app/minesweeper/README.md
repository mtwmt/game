# Minesweeper Game (踩地雷遊戲)

## 專案結構

```
src/app/minesweeper/
├── minesweeper.ts                    # 主元件 (UI 控制器)
├── minesweeper.html                  # 元件範本
├── minesweeper.scss                  # 元件樣式
├── minesweeper.service.ts            # 遊戲邏輯核心服務
├── minesweeper.interface.ts          # 型別定義和介面
└── utils/                            # 工具模組
    ├── minesweeper-config.ts         # 遊戲配置和常數
    ├── minesweeper-validation.ts     # 遊戲規則驗證
    └── minesweeper-mine-generator.ts # 地雷生成和計算
```

```typescript
// 位置
interface Position {
  x: number;
  y: number;
}

// 格子
interface Cell {
  position: Position;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMineCount: number;
  id: string;
}

// 遊戲狀態
interface GameState {
  board: Cell[][];
  width: number;
  height: number;
  mineCount: number;
  revealedCount: number;
  flaggedCount: number;
  gameStatus: GameStatus;
  gameTime: number;
  isFirstClick: boolean;
  difficulty: Difficulty;
}
```

### 遊戲狀態枚舉

```typescript
enum GameStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  WON = 'won',
  LOST = 'lost',
}

enum Difficulty {
  BEGINNER = 'beginner', // 初級
  INTERMEDIATE = 'intermediate', // 中級
  EXPERT = 'expert', // 專家
  CUSTOM = 'custom', // 自訂
}
```

## 核心系統架構

### 1. 配置系統 (minesweeper-config.ts)

#### PC 版配置（傳統踩地雷尺寸）

```typescript
DIFFICULTY_CONFIGS = {
  BEGINNER: { width: 9, height: 9, mines: 10 }, // 初級
  INTERMEDIATE: { width: 16, height: 16, mines: 40 }, // 中級
  EXPERT: { width: 30, height: 16, mines: 99 }, // 專家
};
```

#### 手機版配置（觸控友好）

```typescript
MOBILE_DIFFICULTY_CONFIGS = {
  BEGINNER: { width: 8, height: 8, mines: 8 }, // 初級
  INTERMEDIATE: { width: 11, height: 11, mines: 20 }, // 中級
  EXPERT: { width: 12, height: 16, mines: 40 }, // 專家
};
```

#### 遊戲常數

```typescript
export const GAME_CONFIG = {
  MIN_BOARD_SIZE: 5, // 最小棋盤尺寸
  MAX_BOARD_SIZE: 50, // 最大棋盤尺寸
  MIN_MINES: 1, // 最少地雷數
  TIMER_INTERVAL: 1000, // 計時器間隔
} as const;
```

### 2. 驗證系統 (minesweeper-validation.ts)

提供所有遊戲操作的驗證邏輯（純函數）：

#### 基礎驗證

- `isValidPosition()` - 檢查座標有效性
- `isValidCell()` - 檢查格子有效性
- `isValidDifficulty()` - 檢查難度有效性

#### 遊戲狀態檢查

- `canRevealCell()` - 可否揭開格子
- `canToggleFlag()` - 可否切換旗標
- `isGameWon()` - 是否獲勝
- `isGameLost()` - 是否失敗
- `isGameOver()` - 遊戲是否結束

### 3. 地雷生成系統 (minesweeper-mine-generator.ts)

**核心演算法**：隨機生成地雷，避開首次點擊區域

#### 主要方法

- `generateMinePositions(width, height, mineCount, excludeArea)` - 生成地雷位置
- `calculateNeighborMineCounts(board)` - 計算鄰近地雷數
- `getNeighbors(position, width, height)` - 獲取鄰近格子

**第一次點擊保護**：

```typescript
// 排除首次點擊位置及其8個鄰近格子
const excludeArea = [firstClickPosition, ...getNeighbors(firstClickPosition, width, height)];
```

### 4. 遊戲服務 (minesweeper.service.ts)

**職責**：集中管理遊戲狀態和業務邏輯

#### 核心功能

```typescript
class MinesweeperService {
  // 響應式狀態
  gameState = signal<GameState>({ ...initialGameState });

  // 設備配置
  setDeviceType(isMobile: boolean);

  // 遊戲控制
  initializeGame(difficulty?: Difficulty);
  resetGame();
  setDifficulty(difficulty: Difficulty);

  // 遊戲操作
  revealCell(position: Position): void;
  toggleFlag(position: Position): void;

  // 私有方法
  private initializeMines(firstClickPosition: Position);
  private revealCellRecursive(position: Position);
  private checkGameStatus();

  // 計時管理
  private startTimer();
  private stopTimer();

  // 工具方法
  cleanup();
}
```

### 5. UI 元件 (minesweeper.ts)

**職責**：UI 控制和使用者互動

#### 核心職責

- 從 service 獲取 gameState signal
- 使用 computed 派生 UI 所需屬性
- 處理使用者互動事件
- 管理設備偵測和操作模式

#### 關鍵方法

```typescript
class Minesweeper {
  // 生命週期
  ngOnInit() {
    const isMobile = this.detectMobile();
    this.minesweeperService.setDeviceType(isMobile);
    this.minesweeperService.initializeGame();
  }

  // 使用者互動
  onCellClick(position: Position);
  onCellRightClick(event: MouseEvent, position: Position);
  onCellLongPress(position: Position);

  // 遊戲控制
  resetGame();
  setDifficulty(difficulty: Difficulty);

  // 設備偵測
  detectMobile(): boolean;

  // UI 工具
  getCellClass(cell: Cell): string;
  getCellContent(cell: Cell): string;
}
```

## 遊戲流程

### 1. 初始化流程

```
元件初始化
→ 偵測設備類型（isMobile）
→ setDeviceType()
→ initializeGame()
  → 創建空白棋盤
  → 設置遊戲狀態為 WAITING
```

### 2. 首次點擊流程

```
玩家首次點擊格子
→ onCellClick(position)
→ revealCell(position)
  → initializeMines(firstClickPosition)
    → generateMinePositions() 避開點擊區域
    → calculateNeighborMineCounts() 計算鄰近地雷
  → revealCellRecursive(position) 遞歸揭開
  → startTimer() 開始計時
  → 設置遊戲狀態為 PLAYING
```

### 3. 一般遊戲流程

```
玩家點擊格子
→ onCellClick(position) / onCellRightClick(position)
→ revealCell(position) / toggleFlag(position)
  → 驗證操作有效性
  → 更新格子狀態
  → 如果揭開：
    → 遞歸展開空白區域
    → 檢查是否踩到地雷
  → checkGameStatus()
    → 檢查勝利條件：所有非地雷格子已揭開
    → 檢查失敗條件：揭開地雷格子
```

## 遊戲規則

### 1. 第一次點擊保護

**核心規則**: 第一次點擊保證不會踩到地雷

**實現邏輯**:

- 遊戲開始時不放置地雷
- 第一次點擊後才根據點擊位置生成地雷
- 排除第一次點擊位置及其 8 個鄰近格子

### 2. 空白區域展開

**核心規則**: 點擊空白格子（鄰近地雷數為 0）會自動展開相鄰的空白區域

**實現邏輯**:

- 使用遞歸算法 `revealCellRecursive()`
- 檢查鄰近 8 個方向的格子
- 如果鄰近格子也是空白，繼續遞歸展開

### 3. 旗標系統

- 右鍵點擊（PC）或旗標模式（手機）可標記可疑地雷
- 旗標不影響遊戲邏輯，僅供玩家標記
- 剩餘地雷數 = 總地雷數 - 已標記旗標數

## 控制方式

### PC 版操作（傳統模式）

- **左鍵點擊** - 揭開格子
- **右鍵點擊** - 標記/取消標記旗標
- **滑鼠懸停** - 格子縮放效果

### 手機版操作（模式切換）

- **🔨 挖掘模式** - 點擊揭開格子
- **🚩 標旗模式** - 點擊標記/取消標記旗標
- **模式按鈕** - 大型觸控友好按鈕，避免誤觸
- **長按** - 快速切換旗標

## 難度系統

### PC 版難度配置（傳統踩地雷尺寸）

| 難度 | 棋盤大小 | 地雷數量 | 說明                       |
| ---- | -------- | -------- | -------------------------- |
| 初級 | 9×9      | 10       | 經典初級配置，適合新手學習 |
| 中級 | 16×16    | 40       | 標準中級配置，需要策略思考 |
| 專家 | 30×16    | 99       | 經典專家配置，高難度挑戰   |

### 手機版難度配置（觸控友好）

| 難度 | 棋盤大小 | 地雷數量 | 說明                         |
| ---- | -------- | -------- | ---------------------------- |
| 初級 | 8×8      | 8        | 適合觸控操作的小型棋盤       |
| 中級 | 11×11    | 20       | 中等規模，平衡挑戰與可操作性 |
| 專家 | 12×16    | 40       | 適合手機螢幕的高難度配置     |

### 自訂難度

- 支援自訂棋盤大小（5×5 到 50×50）
- 支援自訂地雷數量（最少 1 個，最多不超過總格數-1）

## UI/UX 設計

### 響應式設計

- **設備自動偵測** - 基於 User Agent 和螢幕寬度智能判斷
- **動態配置載入** - 根據設備類型自動選擇對應配置
- **UI 適應性** - 按鈕大小、格子尺寸、字體大小自動調整
- **操作模式切換** - PC 傳統右鍵，手機模式按鈕

### 視覺元素

#### 數字顏色系統

| 數字 | 顏色 | 風險等級         |
| ---- | ---- | ---------------- |
| 1    | 藍色 | 最常見，相對安全 |
| 2    | 綠色 | 較安全           |
| 3    | 紅色 | 需要注意         |
| 4    | 紫色 | 危險區域         |
| 5    | 黃色 | 高風險           |
| 6    | 粉色 | 極高風險         |
| 7    | 黑色 | 危險警告         |
| 8    | 灰色 | 最高風險         |

#### 格子樣式

- **未揭開** - 漸層背景 + 懸停效果
- **已揭開** - 平面背景 + 數字顏色
- **旗標** - 🚩 Emoji + 黃色高亮
- **地雷** - 💣 Emoji + 紅色背景
- **空白** - 無顯示內容

### 統計區塊

- **剩餘地雷數** - 總地雷數 - 已標記旗標數
- **遊戲時間** - 從第一次點擊開始計時
- **遊戲進度** - 已揭開 / 總非地雷格子百分比

## 技術細節

### 效能優化

1. **OnPush 變更檢測** - 只在 Signal 變化時檢測
2. **Computed Signals** - 自動記憶化，避免重複計算
3. **格子 ID 系統** - 唯一識別符優化 Angular 追蹤
4. **事件防抖** - 避免重複點擊操作

### 測試友善

所有核心邏輯都是純函數，易於單元測試：

```typescript
// 範例：測試地雷生成
const minePositions = MineGenerator.generateMinePositions(9, 9, 10, [{ x: 4, y: 4 }]);
expect(minePositions.length).toBe(10);
expect(minePositions).not.toContainEqual({ x: 4, y: 4 });
```

### 型別安全

- 使用 TypeScript 嚴格模式
- 所有公開 API 都有明確型別定義
- Difficulty 使用 enum
- GameStatus 使用 enum

## 擴展性設計

### 新增難度級別

修改 `minesweeper-config.ts`：

```typescript
export const DIFFICULTY_CONFIGS = {
  // ... 現有配置
  CUSTOM_LEVEL: { width: 20, height: 20, mines: 60 },
};
```

### 新增遊戲模式

1. 在 `GameStatus` 新增狀態
2. 在 `MinesweeperService` 實作邏輯
3. 在 `MinesweeperValidation` 新增驗證
4. 更新 UI 元件

## 程式碼品質原則

### 關注點分離

- **Interface** - 型別定義
- **Config** - 配置和常數
- **Validation** - 驗證邏輯（純函數）
- **Utils** - 工具函數（純函數）
- **Service** - 狀態管理
- **Component** - UI 控制

### 可測試性

- 純函數易於測試
- 服務層與 UI 分離
- 狀態變更可預測

### 可維護性

- 清晰的檔案結構
- 完整的型別定義
- 詳細的註解說明

### 可擴展性

- 模組化設計
- 配置驅動
- 開放封閉原則
