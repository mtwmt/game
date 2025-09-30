# Chinese Chess Game (中國象棋遊戲)

## 專案結構

```
src/app/chinese-chess/
├── chinese-chess.ts                    # 主元件 (UI 控制器)
├── chinese-chess.html                  # 元件範本
├── chinese-chess.scss                  # 元件樣式
├── chinese-chess.service.ts            # 遊戲邏輯核心服務
├── chinese-chess-ai.service.ts         # AI 服務統一介面
├── chinese-chess-piece.interface.ts    # 型別定義和介面
├── board-cache.interface.ts            # 棋盤快取介面和工具
├── utils/                              # 工具類和公用函數
│   ├── chinese-chess-validation.ts    # 象棋規則驗證模組
│   ├── chinese-chess-config.ts        # XQWLight 配置和常數
│   ├── chinese-chess-piece-moves.ts   # 棋子走法管理類
│   ├── chinese-chess-openings.ts      # 開局定式和戰略
│   └── lru-cache.ts                   # LRU 快取實現
├── strategies/                         # AI 策略模組
│   ├── base-strategy.ts               # 策略基類
│   ├── strategy-service.ts            # 策略管理服務
│   ├── xqwlight-strategy.ts           # XQWLight 專業引擎
│   └── gemini-ai-strategy.ts          # Gemini AI 策略（可選）
└── gemini-api-key/                     # API 金鑰管理元件
    └── gemini-api-key.component.ts
```

## 架構設計模式

遵循統一的分層架構：

```
介面定義 → 配置 → 驗證 → 工具 → 策略 → 服務 → 元件
```

### 分層職責

1. **Interface 層** - 型別定義和介面
2. **Config 層** - 遊戲配置、XQWLight 常數、開局定式
3. **Validation 層** - 象棋規則驗證（純函數）
4. **Utils 層** - 棋子走法、棋盤快取（純函數）
5. **Strategy 層** - AI 策略實作（XQWLight、Gemini AI）
6. **Service 層** - 狀態管理和業務邏輯
7. **Component 層** - UI 控制和使用者互動

## 核心型別定義

### 基礎介面

```typescript
// 位置
interface Position {
  x: number; // 0-8 (列座標)
  y: number; // 0-9 (行座標)
}

// 棋子
interface ChessPiece {
  id: string;
  type: PieceType;
  color: PlayerColor;
  position: Position;
  isSelected: boolean;
  hasMoved: boolean;
}

// 遊戲狀態
interface GameState {
  board: (ChessPiece | null)[][]; // 9x10 棋盤陣列
  currentPlayer: PlayerColor; // 當前輪到的玩家
  selectedPiece: ChessPiece | null; // 目前選中的棋子
  validMoves: Position[]; // 選中棋子的有效移動位置
  status: GameResult; // 遊戲狀態（將軍/將死/和棋）
  moveHistory: string[]; // 移動歷史記錄（棋譜）
  isVsAI: boolean; // 是否為人機對戰模式
  aiState: AIState; // AI 思考狀態
  hasApiKey: boolean; // 是否有 Gemini API Key
}
```

### 遊戲狀態枚舉

```typescript
enum PieceType {
  KING, // 將/帥
  ADVISOR, // 士/仕
  ELEPHANT, // 象/相
  HORSE, // 馬
  ROOK, // 車/俥
  CANNON, // 炮/砲
  SOLDIER, // 兵/卒
}

enum PlayerColor {
  RED, // 紅方
  BLACK, // 黑方
}

enum GameResult {
  NONE = 'none',
  CHECK = 'check', // 將軍
  CHECKMATE = 'checkmate', // 將死
  STALEMATE = 'stalemate', // 和棋
  FACE_TO_FACE = 'face', // 王見王
}

enum AIState {
  IDLE = 'idle',
  THINKING = 'thinking',
}

enum AIDifficulty {
  EASY = 'easy', // 簡單（3層搜尋）
  MEDIUM = 'medium', // 中等（5層搜尋）
  HARD = 'hard', // 困難（7層搜尋）
}
```

## 核心系統架構

### 1. 配置系統 (utils/chinese-chess-config.ts)

#### XQWLight 棋子價值表

```typescript
export const PIECE_VALUES = {
  [PieceType.KING]: 10000, // 將/帥價值最高
  [PieceType.ROOK]: 600, // 車
  [PieceType.CANNON]: 300, // 炮
  [PieceType.HORSE]: 300, // 馬
  [PieceType.ADVISOR]: 20, // 士
  [PieceType.ELEPHANT]: 20, // 象
  [PieceType.SOLDIER]: 100, // 兵
};
```

#### 位置評估表（Position Square Tables）

每種棋子都有 90 個位置的評估分數，用於評估棋子在不同位置的價值。

```typescript
export const POSITION_VALUES = {
  [PieceType.KING]: [
    /* 90個位置分數 */
  ],
  [PieceType.ADVISOR]: [
    /* 90個位置分數 */
  ],
  // ... 其他棋子
};
```

#### AI 難度配置

```typescript
export const AI_CONFIG = {
  [AIDifficulty.EASY]: { depth: 3, timeLimit: 8000 },
  [AIDifficulty.MEDIUM]: { depth: 5, timeLimit: 8000 },
  [AIDifficulty.HARD]: { depth: 7, timeLimit: 8000 },
};
```

### 2. 驗證系統 (utils/chinese-chess-validation.ts)

提供所有象棋規則的驗證邏輯（純函數）：

#### 基礎驗證

- `isValidPosition()` - 檢查座標有效性
- `isWithinPalace()` - 檢查是否在九宮格內
- `canCrossRiver()` - 檢查是否可過河

#### 移動驗證

- `isValidKingMove()` - 將/帥移動規則
- `isValidAdvisorMove()` - 士/仕移動規則
- `isValidElephantMove()` - 象/相移動規則
- `isValidHorseMove()` - 馬移動規則（含蹩馬腳）
- `isValidRookMove()` - 車移動規則
- `isValidCannonMove()` - 炮移動規則
- `isValidSoldierMove()` - 兵/卒移動規則

#### 特殊規則檢查

- `isKingsFacingEachOther()` - 王見王檢測
- `isInCheck()` - 將軍檢測
- `isCheckmate()` - 將死檢測
- `wouldBeInCheckAfterMove()` - 移動後是否被將軍

### 3. 棋子走法系統 (utils/chinese-chess-piece-moves.ts)

**核心類別**：`PieceMovesManager`

#### 主要方法

- `getValidMoves(piece, board)` - 獲取棋子所有合法移動
- `getKingMoves()` - 將/帥可走位置
- `getAdvisorMoves()` - 士/仕可走位置
- `getElephantMoves()` - 象/相可走位置
- `getHorseMoves()` - 馬可走位置（L 型走法）
- `getRookMoves()` - 車可走位置（直線）
- `getCannonMoves()` - 炮可走位置（隔子吃子）
- `getSoldierMoves()` - 兵/卒可走位置

**設計特色**：

- 所有方法都是靜態純函數
- 自動過濾會導致自己被將軍的移動
- 支援蹩馬腳、象眼等特殊規則

### 4. 開局系統 (utils/chinese-chess-openings.ts)

**核心功能**：開局定式庫，提升開局階段的 AI 表現

#### 開局類型

```typescript
export const OPENING_MOVES = {
  // 中炮過河車
  CENTER_CANNON_RIVER_ROOK: [
    'h2e2', // 炮二平五
    'b9c7', // 馬８進７
    'h0g2', // 馬二進三
    // ...
  ],

  // 屏風馬
  SCREEN_HORSES: [
    'h2e2', // 炮二平五
    'h9g7', // 馬８進７
    'b0c2', // 馬二進三
    // ...
  ],

  // ... 更多開局定式
};
```

### 5. XQWLight AI 引擎 (strategies/xqwlight-strategy.ts)

**核心演算法**：Alpha-Beta 搜尋 + 位置評估

#### 主要方法

```typescript
class XQWLightStrategy {
  // AI 決策入口
  makeMove(gameState: GameState, difficulty: AIDifficulty): Move;

  // Alpha-Beta 搜尋
  private alphaBeta(
    board: Board,
    depth: number,
    alpha: number,
    beta: number,
    maximizing: boolean,
    startTime: number
  ): number;

  // 棋盤評估
  private evaluateBoard(board: Board, color: PlayerColor): number;

  // 位置評估
  private evaluatePiecePosition(piece: ChessPiece): number;

  // 移動排序（提升剪枝效率）
  private orderMoves(moves: Move[]): Move[];
}
```

**演算法特色**：

- **Alpha-Beta 剪枝** - 減少不必要的搜尋
- **迭代加深** - 在時間限制內盡可能搜尋更深
- **位置評估** - 使用 XQWLight 原版評分表
- **移動排序** - 優先搜尋吃子和將軍移動
- **時間控制** - 8 秒思考時間限制

### 6. 遊戲服務 (chinese-chess.service.ts)

**職責**：集中管理遊戲狀態和業務邏輯

#### 核心功能

```typescript
class ChineseChessService {
  // 響應式狀態
  gameState = signal<GameState>({ ...initialGameState });

  // 遊戲控制
  initializeGameState(): void;
  resetGame(): void;
  setGameMode(isVsAI: boolean): void;
  setAIDifficulty(difficulty: AIDifficulty): void;

  // 遊戲操作
  makeMove(from: Position, to: Position): MoveResult;
  selectPiece(position: Position): void;
  undoMove(): void;

  // 私有方法
  private switchPlayer(): void;
  private checkGameStatus(): void;
  private updateMoveHistory(move: Move): void;

  // 工具方法
  exportGame(): string;
  importGame(pgn: string): boolean;
}
```

### 7. AI 服務 (chinese-chess-ai.service.ts)

**職責**：協調不同 AI 策略

#### 核心功能

```typescript
class ChineseChessAiService {
  // AI 移動
  makeAIMove(gameState: GameState): Observable<MoveResult>;

  // 策略選擇
  private selectStrategy(): AIStrategy;

  // 錯誤處理
  private handleAIError(): MoveResult;
}
```

**支援的 AI 策略**：

1. **XQWLight** - 預設專業引擎
2. **Gemini AI** - 可選的 LLM 策略（需 API Key）

### 8. UI 元件 (chinese-chess.ts)

**職責**：UI 控制和使用者互動

#### 核心職責

- 從 service 獲取 gameState signal
- 使用 computed 派生 UI 所需屬性
- 處理使用者互動事件
- 管理棋譜顯示

#### 關鍵方法

```typescript
class ChineseChess {
  // 生命週期
  ngOnInit() {
    this.chineseChessService.initializeGameState();
  }

  // 使用者互動
  onSquareClick(position: Position);
  onPieceSelect(piece: ChessPiece);

  // 遊戲控制
  resetGame();
  toggleGameMode();
  setAIDifficulty(difficulty: AIDifficulty);
  undoMove();

  // 棋譜管理
  toggleMoveHistory();
  exportGame();
  importGame(pgn: string);

  // UI 工具
  getPieceDisplay(piece: ChessPiece): string;
  isValidMoveTarget(position: Position): boolean;
}
```

## 遊戲流程

### 1. 初始化流程

```
元件初始化
→ initializeGameState()
  → 創建 9x10 空白棋盤
  → 放置 32 個棋子（紅黑各 16 個）
  → 設置遊戲狀態為 NONE
  → 紅方先行
```

### 2. 玩家移動流程

```
玩家點擊棋盤
→ onSquareClick(position)
→ 如果已選中棋子：
  → makeMove(from, to)
    → ChessValidation.isValidMove() 驗證移動
    → 執行移動
    → checkGameStatus() 檢查將軍/將死
    → updateMoveHistory() 更新棋譜
    → switchPlayer() 切換玩家
    → 如果人機模式且輪到 AI：
      → triggerAIMove()
→ 如果未選中棋子：
  → selectPiece(position)
    → PieceMovesManager.getValidMoves() 計算合法移動
    → 高亮顯示可走位置
```

### 3. AI 移動流程

```
triggerAIMove()
→ ChineseChessAiService.makeAIMove(gameState)
→ StrategyService.executeAIMove()
  → 檢查開局庫（前 10 步）
  → 如果是開局階段：
    → 使用開局定式
  → 否則：
    → XQWLightStrategy.makeMove()
      → alphaBeta() 搜尋最佳移動
      → evaluateBoard() 評估局面
  → 驗證移動合法性
  → 執行移動
  → 更新棋譜
```

## 遊戲規則

### 1. 王見王規則

**核心規則**：玩家可以移動造成王見王，但移動後造成王見王的一方立即敗北

**實現邏輯**：

- 移動前不阻擋王見王移動
- 移動後檢查王見王並判定勝負
- AI 會避免造成王見王的移動

### 2. 將軍規則

- 對方的將/帥被己方棋子攻擊，稱為「將軍」
- 被將軍方必須應將（移動將、吃掉攻擊棋子、墊子阻擋）
- 如果無法應將，則為「將死」，遊戲結束

### 3. 棋子移動規則

| 棋子  | 移動規則                       |
| ----- | ------------------------------ |
| 將/帥 | 九宮格內直線走一格             |
| 士/仕 | 九宮格內斜線走一格             |
| 象/相 | 田字走法，不可過河，不可塞象眼 |
| 馬    | 日字走法，不可蹩馬腳           |
| 車    | 直線任意格數                   |
| 炮    | 移動同車，吃子需隔一子         |
| 兵/卒 | 過河前只能直走，過河後可橫走   |

## 控制方式

### 基本操作

- **點擊棋子** - 選中棋子，顯示可走位置（綠色圓點）
- **點擊目標位置** - 移動棋子
- **點擊空白處** - 取消選中

### 功能按鈕

- **重新開始** - 重置遊戲
- **悔棋** - 撤銷上一步（人機模式撤銷 2 步）
- **切換模式** - 雙人/人機對戰
- **難度選擇** - 簡單/中等/困難
- **棋譜按鈕** - 查看完整移動歷史
- **匯出/匯入** - PGN 格式棋譜

## AI 系統

### XQWLight 引擎特性

- **Alpha-Beta 搜尋** - 專業搜尋算法
- **動態難度** - 3-7 層搜尋深度
- **時間限制** - 最多 8 秒思考時間
- **評分系統** - XQWLight 原版棋子價值表和位置評估
- **開局優化** - 使用開局定式庫

### 棋子價值（基礎分數）

```
將/帥: 10000
車:   600
炮:   300
馬:   300
兵:   100
士:   20
象:   20
```

### 難度設定

| 難度 | 搜尋深度 | 思考時間 | 特性         |
| ---- | -------- | -------- | ------------ |
| 簡單 | 3 層     | 8 秒     | 適合初學者   |
| 中等 | 5 層     | 8 秒     | 有一定挑戰性 |
| 困難 | 7 層     | 8 秒     | 專業級 AI    |

## UI/UX 設計

### 響應式設計

- **棋盤自適應** - 根據螢幕尺寸調整棋盤大小
- **觸控友好** - 大型可點擊區域
- **視覺反饋** - 選中高亮、可走位置標示

### 視覺元素

#### 棋盤樣式

- **楚河漢界** - 中間分隔線
- **九宮格** - 將/帥活動區域標示
- **座標標記** - a-i (橫) 和 0-9 (縱)

#### 棋子顯示

- **紅方** - 紅色圓形，黑字
- **黑方** - 黑色圓形，白字
- **選中狀態** - 黃色高亮邊框
- **可走位置** - 綠色圓點標記

### 統計區塊

- **當前對戰** - 顯示人機/雙人模式
- **當前回合** - 紅方/黑方指示
- **最後一步** - 顯示最新棋譜
- **目前難度** - AI 難度設定
- **棋譜記錄** - 整合式棋譜查看按鈕

### 棋譜系統

- **浮動彈窗** - 全螢幕棋譜記錄查看
- **步數統計** - 實時顯示棋譜步數
- **移動歷史** - 完整的對局記錄
- **匯出功能** - 支援 PGN 格式

## 技術細節

### 效能優化

1. **OnPush 變更檢測** - 只在 Signal 變化時檢測
2. **Computed Signals** - 自動記憶化，避免重複計算
3. **LRU 快取** - 快取移動計算結果
4. **Board 快取** - 快取王位置和棋子列表
5. **Alpha-Beta 剪枝** - 減少搜尋節點數

### LRU 快取系統

```typescript
class LRUCache<K, V> {
  constructor(capacity: number);
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  clear(): void;
}
```

用於快取：

- 合法移動計算結果
- 棋盤評估分數
- 搜尋結果

### 測試友善

所有核心邏輯都是純函數，易於單元測試：

```typescript
// 範例：測試馬的走法
const moves = PieceMovesManager.getHorseMoves(
  { x: 4, y: 4, type: PieceType.HORSE, color: PlayerColor.RED },
  emptyBoard
);
expect(moves.length).toBe(8); // 馬在中心有8個可走位置
```

### 型別安全

- 使用 TypeScript 嚴格模式
- 所有公開 API 都有明確型別定義
- PieceType、PlayerColor、GameResult 使用 enum
- 完整的型別覆蓋率

## 擴展性設計

### 新增 AI 策略

1. 實作 `AIStrategy` 介面
2. 在 `StrategyService` 註冊新策略
3. 在 UI 新增策略選擇選項

```typescript
class NewAIStrategy implements AIStrategy {
  makeMove(gameState: GameState): Move {
    // 實作 AI 邏輯
  }
}
```

### 新增開局定式

修改 `utils/chinese-chess-openings.ts`：

```typescript
export const OPENING_MOVES = {
  // ... 現有開局
  NEW_OPENING: [
    'move1',
    'move2',
    // ...
  ],
};
```

### 新增棋譜格式

1. 在 Service 實作匯出/匯入邏輯
2. 支援不同格式（PGN、FEN 等）
3. 更新 UI 匯入/匯出介面

## 程式碼品質原則

### 關注點分離

- **Interface** - 型別定義
- **Config** - 配置、常數、開局定式
- **Validation** - 規則驗證（純函數）
- **Utils** - 工具函數（純函數）
- **Strategy** - AI 策略實作
- **Service** - 狀態管理
- **Component** - UI 控制

### 可測試性

- 純函數易於測試
- 服務層與 UI 分離
- AI 策略可獨立測試
- 狀態變更可預測

### 可維護性

- 清晰的檔案結構
- 完整的型別定義
- 詳細的註解說明
- 模組化設計

### 可擴展性

- 策略模式 (AI 引擎可抽換)
- 配置驅動 (難度、開局)
- 開放封閉原則
- 介面導向設計

## 與其他遊戲比較

| 特色         | Snake | Minesweeper | Pet Match | Chinese Chess |
| ------------ | ----- | ----------- | --------- | ------------- |
| 架構層級     | 6 層  | 6 層        | 6 層      | 7+ 層         |
| 複雜度       | 低    | 中          | 中        | 高            |
| AI 系統      | ✗     | ✗           | ✗         | ✅ (XQWLight) |
| 使用 Service | ✅    | ✅          | ✅        | ✅            |
| Signal-based | ✅    | ✅          | ✅        | ✅            |
| OnPush       | ✅    | ✅          | ✅        | ✅            |
| 純函數設計   | ✅    | ✅          | ✅        | ✅            |
| SSR 支援     | ✅    | ✅          | ✅        | ✅            |
| 快取系統     | ✗     | ✗           | ✗         | ✅ (LRU)      |
| 開局庫       | ✗     | ✗           | ✗         | ✅            |

## 未來改進方向

- [ ] 支援線上對戰（WebSocket）
- [ ] 加入殘局練習模式
- [ ] AI 自我學習（強化學習）
- [ ] 完整的單元測試覆蓋率
- [ ] E2E 測試
- [ ] 棋譜分析功能
- [ ] 更多開局定式
- [ ] 支援更多棋譜格式（FEN、UCCI）
- [ ] 加入音效和動畫
- [ ] 排行榜系統

## 參考資料

- [XQWLight 引擎](https://www.xqbase.com/computer/xqwlight.htm)
- [中國象棋規則](https://zh.wikipedia.org/wiki/中國象棋)
- [Alpha-Beta 剪枝演算法](https://en.wikipedia.org/wiki/Alpha–beta_pruning)
- [Angular 20 最佳實踐](https://angular.dev/best-practices)
- [Angular Signals 指南](https://angular.dev/guide/signals)
