# 寵物連連看架構文件

## 專案結構

```
src/app/pet-match/
├── pet-match.interface.ts              # 型別定義
├── pet-match.service.ts                # 核心遊戲服務（狀態管理）
├── pet-match.ts                        # UI 元件
├── pet-match.html                      # 範本檔案
└── utils/
    ├── pet-match-config.ts             # 配置與常數（含動態棋盤計算）
    ├── pet-match-validation.ts         # 驗證邏輯
    ├── pet-match-logic.ts              # 遊戲邏輯工具（棋盤、重力）
    └── pet-match-pathfinding.ts        # 路徑搜尋演算法
```

## 架構設計模式

遵循與踩地雷相同的分層架構：

```
介面定義 → 配置 → 驗證 → 工具 → 服務 → 元件
```

### 分層職責

1. **Interface 層** - 型別定義和介面
2. **Config 層** - 遊戲配置和常數
3. **Validation 層** - 驗證邏輯（純函數）
4. **Utils 層** - 遊戲邏輯工具（純函數）
5. **Service 層** - 狀態管理和業務邏輯
6. **Component 層** - UI 控制和使用者互動

## 核心型別定義

### 基礎介面

```typescript
// 方塊
interface Tile {
  id: number;
  petType: number; // 0-11，對應12種寵物
  position: Position; // 棋盤座標
  selected: boolean; // 是否被選中
}

// 座標
interface Position {
  x: number; // 列座標
  y: number; // 行座標
}

// 路徑片段
interface PathSegment {
  start: Position;
  end: Position;
  direction: 'horizontal' | 'vertical';
}

// 遊戲狀態
interface GameState {
  board: (Tile | null)[][];
  width: number;
  height: number;
  petTypes: number;
  score: number;
  level: number;
  moves: number;
  remainingTiles: number;
  gameStatus: GameStatus;
  levelStatus: LevelStatus;
  gameTime: number;
  countdownTime: number;
  // 道具系統
  totalShufflesUsed: number;
  totalHintsUsed: number;
  maxShufflesPerGame: number;
  maxHintsPerGame: number;
  // 提示系統
  hintTiles: Tile[];
  showHint: boolean;
}
```

### 遊戲狀態枚舉

```typescript
enum GameStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  TIME_UP = 'timeup',
  NO_MOVES = 'nomoves',
  COMPLETE = 'complete',
}

enum LevelStatus {
  PLAYING = 'playing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

type LevelType = 'classic' | 'down' | 'up' | 'left' | 'right';
```

## 核心系統架構

### 1. 配置系統 (pet-match-config.ts)

#### PC 版配置

```typescript
const GAME_CONFIG = {
  width: 7,
  height: 10,
  petTypes: 12,
  maxLevelTime: 300, // 5分鐘
};
```

#### 動態棋盤計算（手機版）

**特色**：自動根據螢幕尺寸計算最適合的棋盤配置

```typescript
calculateOptimalMobileBoard(screenWidth, screenHeight);
```

**關鍵特性**：

- ✅ 使用共用的 `calculateOptimalBoard()` 工具
- ✅ **確保總格子數為雙數**（配對遊戲需求）
- ✅ 自動調整寵物類型數量
- ✅ 針對連連看優化參數：
  - `cellSize: 48px`（比踩地雷更大）
  - `paddingVertical: 280px`（考慮統計區域）
  - `maxBoardWidth: 10`（手機版限制）

**雙數保證邏輯**：

```typescript
if (totalCells % 2 !== 0) {
  // 優先減少高度
  if (board.height > minBoardSize) {
    board.height--;
  } else if (board.width > minBoardSize) {
    // 如果高度已最小，則減少寬度
    board.width--;
  }
}
```

#### 遊戲常數

```typescript
const GAME_CONSTANTS = {
  MATCH_SCORE: 10, // 每次配對得分
  MAX_SHUFFLES_PER_GAME: 5, // 重排次數
  MAX_HINTS_PER_GAME: 5, // 提示次數
  PATH_ANIMATION_TIME: 200, // 路徑動畫時間
  SELECTION_CLEAR_TIME: 300, // 選擇清除延遲
  MAX_LEVELS: 5, // 總關卡數
  MAX_TURNS: 2, // 最多2個轉彎
  TIMER_INTERVAL: 1000, // 計時器間隔
};
```

### 2. 驗證系統 (pet-match-validation.ts)

提供所有遊戲操作的驗證邏輯（純函數）：

#### 基礎驗證

- `isValidPosition()` - 檢查座標有效性
- `isValidGameConfig()` - 檢查配置有效性（含雙數檢查）
- `isValidLevel()` - 檢查關卡等級

#### 遊戲狀態檢查

- `canMakeMove()` - 可否進行操作
- `canClickTile()` - 可否點擊方塊
- `canMatch()` - 兩方塊可否配對
- `isLevelComplete()` - 關卡是否完成
- `isGameOver()` - 遊戲是否結束

#### 道具系統檢查

- `canUseShuffle()` - 可否使用重排
- `canUseHint()` - 可否使用提示

### 3. 路徑搜尋系統 (pet-match-pathfinding.ts)

**核心演算法**：最多 2 次轉彎的路徑搜尋

#### 尋路策略（優先順序）

1. **直線路徑**（0 轉彎）

   - 水平直線
   - 垂直直線

2. **L 型路徑**（1 轉彎）

   - 先垂直後水平
   - 先水平後垂直

3. **U 型和ㄈ型路徑**（2 轉彎）

   - 水平-垂直-水平（U 型）
   - 垂直-水平-垂直（ㄈ型）

4. **邊界路徑**
   - 利用棋盤外圍空間
   - 支援上/下/左/右邊界

**路徑驗證規則**：

- 路徑不能被其他方塊阻擋
- 棋盤內位置必須為空
- 棋盤外位置視為有效

### 4. 遊戲邏輯系統 (pet-match-logic.ts)

提供遊戲核心邏輯工具：

#### 棋盤操作

- `initializeBoard()` - 初始化棋盤（確保成對）
- `removeTiles()` - 移除配對方塊
- `getRemainingTileCount()` - 計算剩餘方塊
- `isGameComplete()` - 檢查遊戲完成

#### 重力系統

- `collapseBoardDown()` - 向下重力
- `collapseBoardUp()` - 向上重力
- `collapseBoardLeft()` - 向左重力
- `collapseBoardRight()` - 向右重力

#### 輔助功能

- `hasValidMoves()` - 檢查是否有可用移動
- `findValidPair()` - 尋找有效配對（提示用）
- `formatTime()` - 格式化時間顯示

### 5. 遊戲服務 (pet-match.service.ts)

**職責**：集中管理遊戲狀態和業務邏輯

#### 核心功能

```typescript
class PetMatchService {
  // 響應式狀態
  gameState = signal<GameState>({ ...initialGameState });

  // 設備配置
  setDeviceType(isMobile, screenWidth?, screenHeight?);

  // 遊戲控制
  initializeGame();
  resetGame();
  nextLevel();

  // 遊戲操作
  attemptMatch(tile1, tile2): MatchResult;
  shuffleTiles();
  useHint();
  hideHint();

  // 計時管理
  private startLevelTimer();
  private stopAllTimers();

  // 工具方法
  getRemainingShuffles(): number;
  getRemainingHints(): number;
  formatTime(seconds): string;
  cleanup();
}
```

#### 設備適配流程

1. 元件初始化時呼叫 `setDeviceType()`
2. Service 根據設備類型選擇配置：
   - 手機：使用 `calculateOptimalMobileBoard()`
   - PC：使用固定 `GAME_CONFIG`
3. 動態配置應用於所有遊戲操作

### 6. UI 元件 (pet-match.ts)

**職責**：UI 控制和使用者互動

#### 核心職責

- 從 service 獲取 gameState signal
- 使用 computed 派生 UI 所需屬性
- 處理使用者互動事件
- 管理動畫和視覺效果

#### 關鍵方法

```typescript
class PetMatch {
  // 生命週期
  ngOnInit() {
    // 設置設備類型
    const isMobile = window.innerWidth <= 768;
    this.petMatchService.setDeviceType(isMobile, width, height);
    this.petMatchService.initializeGame();
  }

  // 使用者互動
  onTileClick(tile);
  shuffleTiles();
  useHint();

  // 遊戲控制
  nextLevel();
  resetGame();

  // UI 工具
  getTileClass(tile): string;
  getPathStyle(segment): any;
  isHintTile(tile): boolean;
}
```

## 遊戲流程

### 1. 初始化流程

```
元件初始化
→ 偵測設備類型（isMobile, width, height）
→ setDeviceType()
→ initializeGame()
  → getGameConfig() 根據設備取得配置
  → initializeBoard() 生成配對方塊
  → 啟動倒數計時器
```

### 2. 配對流程

```
玩家點擊方塊
→ onTileClick(tile)
→ PetMatchValidation.canClickTile() 驗證
→ 更新選中狀態
→ 如果選中2個方塊：
  → attemptMatch(tile1, tile2)
    → PetMatchValidation.canMatch() 驗證
    → PetMatchPathfinding.findPath() 尋找路徑
    → 如果找到路徑：
      → 顯示路徑動畫
      → PetMatchLogic.removeTiles() 移除方塊
      → 根據關卡類型應用重力
      → 更新分數和統計
      → 檢查關卡完成
```

### 3. 關卡進程

```
檢查關卡完成
→ PetMatchValidation.isLevelComplete()
→ 如果完成：
  → 停止計時器
  → 如果 level >= 5：
    → 設置 COMPLETE 狀態
  → 否則：
    → 設置 COMPLETED 狀態
    → 等待玩家進入下一關
→ 否則檢查是否有可用移動：
  → PetMatchLogic.hasValidMoves()
  → 如果無移動且還有重排：
    → 自動重排
  → 如果無移動且無重排：
    → 設置 NO_MOVES 狀態
```

## 關卡系統

### 重力類型

| 關卡    | 重力類型      | 說明               |
| ------- | ------------- | ------------------ |
| 第 1 關 | CLASSIC       | 無重力，消除後留空 |
| 第 2 關 | GRAVITY_DOWN  | 方塊向下掉落       |
| 第 3 關 | GRAVITY_UP    | 方塊向上飄移       |
| 第 4 關 | GRAVITY_LEFT  | 方塊向左滑動       |
| 第 5 關 | GRAVITY_RIGHT | 方塊向右滑動       |

### 關卡配置

- **每關限時**：5 分鐘
- **總關卡數**：5 關
- **過關條件**：消除所有方塊
- **失敗條件**：時間到或無可用移動

## 道具系統

### 重排功能

- **次數**：整個遊戲共 5 次
- **作用**：重新洗牌所有方塊
- **觸發**：
  - 手動點擊重排按鈕
  - 自動觸發（無可用移動時）

### 提示功能

- **次數**：整個遊戲共 5 次
- **作用**：顯示一組可配對的方塊
- **顯示**：綠色高亮 + 脈衝動畫
- **持續**：3 秒自動隱藏

## 計分系統

### 基礎分數

- **成功配對**：每對 10 分

### 統計項目

- 總分數
- 移動次數
- 遊戲時間
- 道具使用次數

## UI/UX 設計

### 響應式設計

- **手機優先**：基於 `max-w-sm` 的緊湊設計
- **觸控友善**：方塊尺寸 48×48px
- **動態棋盤**：自動適應螢幕尺寸

### 視覺元素

#### 棋盤外框

- 背景：`bg-lime-900/40` 深綠半透明
- 邊框：`border-lime-800`
- 間距：`gap-[1px]`
- 內邊距：`p-2`

#### 方塊樣式

- 基礎：圓角 + 漸層背景 + 2px 邊框
- 選中：黃色高亮 + 亮度提升
- 提示：綠色 + 脈衝動畫 + 外圈光暈
- 空格：深灰半透明

#### 連線動畫

- 顏色：黃橙漸層 (`#fbbf24` → `#f59e0b`)
- 粗細：2px
- 效果：光暈陰影
- 精確度：通過方塊中心（含 padding 和 gap 偏移）

### 統計區塊

```
┌────────────────────────────┐
│ 關卡(cyan) 分數(lime)      │
│ 移動(yellow) 剩餘(orange)  │
│ 已選(purple) 固定寬度      │
│ ═══ 時間線條 ═══           │
└────────────────────────────┘
```

## 效能優化

### Signal 架構

- 使用 Angular Signals 實現響應式
- Computed 自動計算衍生狀態
- 最小化重新渲染

### 記憶體管理

- `ngOnDestroy` 清除所有計時器
- 適當的事件監聽器管理
- 避免記憶體洩漏

### 演算法優化

- 早期終止：找到路徑立即返回
- 邊界檢查：避免無效探索
- 純函數設計：易於最佳化

### SSR 支援

- 使用 `isPlatformBrowser` 檢查
- 計時器僅在瀏覽器環境啟動
- 正確處理 window 物件

## 測試建議

### 單元測試重點

1. **Validation 層**

   - 所有驗證函數的邊界條件
   - 雙數檢查邏輯

2. **Pathfinding 層**

   - 各種路徑類型
   - 邊界情況

3. **Logic 層**

   - 棋盤初始化（確保成對）
   - 重力系統正確性

4. **Service 層**
   - 狀態轉換邏輯
   - 計時器管理

### E2E 測試場景

1. 完整遊戲流程
2. 道具功能測試
3. 關卡進程測試
4. 響應式布局測試

## 擴展性設計

### 新增寵物類型

修改 `pet-match-config.ts`：

```typescript
export const PET_EMOJIS = [..., '🦁', '🐯'];
export const PET_COLORS = [..., 'from-...'];
```

### 新增關卡模式

1. 在 `LevelType` 新增類型
2. 在 `getLevelType()` 新增對應邏輯
3. 在 `PetMatchLogic` 實作重力邏輯

### 新增道具功能

1. 在 `GameState` 新增狀態
2. 在 `GAME_CONSTANTS` 新增配置
3. 在 Service 實作邏輯
4. 在 Validation 新增驗證

## 程式碼品質原則

### 關注點分離

- **Interface**：型別定義
- **Config**：配置和常數
- **Validation**：驗證邏輯（純函數）
- **Utils**：工具函數（純函數）
- **Service**：狀態管理
- **Component**：UI 控制

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
