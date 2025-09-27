# CLAUDE.md

此檔案為 Claude Code (claude.ai/code) 在此程式庫中工作時的指引。

## 開發指令

- **啟動開發伺服器**: `ng serve` (可於 http://localhost:4200 存取)
- **建置專案**: `ng build`
- **執行測試**: `ng test`
- **監看建置**: `ng build --watch --configuration development`
- **啟動 SSR**: `node dist/game/server/server.mjs`

## 專案架構

這是一個支援伺服器端渲染 (SSR) 的 Angular 20.2.0 應用程式，實作各種瀏覽器遊戲。專案使用：

- **前端**: Angular 與獨立元件、基於 signals 的狀態管理
- **樣式**: TailwindCSS 與自訂 Game Boy 和霓虹美學主題
- **建置**: Angular CLI 搭配 esbuild
- **測試**: Jasmine + Karma

### 主要結構

- `src/app/app.ts` - 主應用程式元件，包含導航和主題切換
- `src/app/app.routes.ts` - 延遲載入路由設定
- `src/app/home/` - 首頁元件
- `src/app/snake/` - 貪食蛇遊戲實作
- `src/app/pet-match/` - 寵物配對遊戲
- `src/app/chinese-chess/` - 中國象棋遊戲 (搭載 XQWLight 專業引擎)
  - `strategies/xqwlight-strategy.ts` - XQWLight 專業引擎
  - `strategies/gemini-ai-strategy.ts` - Gemini AI 策略 (可選)
  - `chess-values.ts` - XQWLight 原版評分表
  - `chess-ai.service.ts` - AI 策略管理器
- `src/app/guideline/` - 指引元件
- `src/server.ts` - Express SSR 伺服器設定

### 遊戲實作模式

遊戲以獨立的 Angular 元件實作，具備：

- 基於 Signal 的響應式狀態管理
- 觸控/鍵盤控制與方向驗證
- 使用 `setInterval` 的遊戲循環，並在 `ngOnDestroy` 中清理
- 響應式設計與行動裝置專用控制
- TailwindCSS 主題類別 (復古風格用 lime/green，霓虹風格用 fuchsia/cyan)

### 程式碼慣例

- 使用 Angular signals 進行狀態管理，而非傳統的 RxJS observables
- 元件使用 `protected` 可見性給範本可存取的成員
- 獨立元件與明確引入
- SCSS 樣式搭配 TailwindCSS 工具類別
- 遊戲實體的 TypeScript 介面 (Position, Direction 型別)

### 目前遊戲

- **貪食蛇 (Snake)**: 完整實作，包含暫停/繼續、觸控控制、碰撞偵測
- **寵物配對 (Pet Match)**: 已實作基礎遊戲功能
- **中國象棋 (Chinese Chess)**: 完整象棋遊戲，搭載 XQWLight 專業引擎
  - XQWLight 原版 Alpha-Beta 搜尋引擎
  - XQWLight 經典評分表和位置價值表
  - 專業移動排序 (MVV-LVA + 殺手移動 + 歷史表)
  - 3-7 層搜尋深度 (可調難度)
  - 8 秒思考時間上限
  - 經過驗證的專業棋力

## 中國象棋檔案架構與邏輯

### 核心檔案結構

```
src/app/chinese-chess/
├── chinese-chess.ts                  # 主元件 (UI 控制器)
├── chess-game.service.ts            # 遊戲邏輯核心服務 (包含王見王判定)
├── chess-ai.service.ts              # AI 服務統一介面
├── chess-piece.interface.ts         # 型別定義和介面
├── board-cache.interface.ts         # 棋盤快取介面和工具 (王位置和棋子列表快取)
├── utils/                           # 工具類和公用函數
│   ├── chinese-chess-validation.ts # 統一驗證模組 (象棋規則驗證，不含王見王阻擋)
│   ├── chinese-chess-values.ts     # XQWLight 評分表和常數
│   ├── chinese-chess-openings.ts   # 開局庫 (可選)
│   ├── chinese-chess-piece-moves.ts# 棋子走法管理類 (純移動邏輯，不含王見王阻擋)
│   ├── lru-cache.ts                # LRU 快取實現 (提升移動計算性能)
│   └── xqwlight-engine/            # XQWLight 引擎檔案
│       ├── search.js               # 搜尋算法
│       ├── position.js             # 位置評估
│       ├── board.js                # 棋盤操作
│       └── book.js                 # 開局庫
├── chess-ai/                        # AI 策略模組
│   ├── base-ai-strategy.ts         # 策略基類 (統一邏輯)
│   ├── ai-strategy-coordinator.ts  # AI 策略協調器
│   ├── xqwlight-strategy.ts        # XQWLight 專業引擎
│   └── gemini-ai-strategy.ts       # Gemini AI 策略
└── gemini-api-key/                  # API 金鑰管理元件
    └── gemini-api-key.component.ts
```

### 核心型別定義

```typescript
// 基礎介面
interface Position {
  x: number;
  y: number;
}
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
  status: GameStatus; // 遊戲狀態 (將軍/將死/和棋)
  moveHistory: string[]; // 移動歷史記錄 (棋譜)
  isVsAI: boolean; // 是否為人機對戰模式
  aiState: AIState; // AI 思考狀態
  hasApiKey: boolean; // 是否有 Gemini API Key
}

// 列舉類型
enum PieceType {
  KING,
  ADVISOR,
  ELEPHANT,
  HORSE,
  ROOK,
  CANNON,
  SOLDIER,
}
enum PlayerColor {
  RED,
  BLACK,
}
```

### 核心邏輯流程

#### 1. 遊戲初始化流程

```
ChineseChess.ngOnInit()
→ resetGame()
→ ChessGameService.initializeGameState()
→ 初始化 9x10 棋盤、放置棋子、設置遊戲狀態
```

#### 2. 玩家移動處理流程

```
玩家點擊棋盤
→ onSquareClick(x, y)
→ handleSelectedPieceClick() / handleInitialPieceClick()
→ selectPiece() / makeMove()
→ ChessGameService.makeMove(gameState, from, to)
→ 驗證移動、更新棋盤、檢查遊戲狀態
→ processMoveResult() → 切換玩家、更新歷史、觸發AI
```

#### 3. AI 思考與移動流程 (重構後)

```
triggerAIMove()
→ ChessGameService.makeAIMove(gameState, aiStrategy)
→ 1. 檢查 AI 策略是否可用
→ 2. 調用 AI 策略.makeMove() 獲取決策
→ 3. ChessValidation 驗證 AI 返回的移動
→ 4. 如果合法則執行，否則使用備用策略
→ processAIMoveResult()
```

**新架構優勢**：

- AI 策略只負責決策 (返回 { from, to })
- 所有驗證統一在 ChessGameService 處理
- 完全解決了過度設計問題

### 王見王規則實現

**核心規則**: 玩家可以移動造成王見王，但移動後造成王見王的一方立即敗北

**實現邏輯**:
1. **移動前不阻擋**: `PieceMovesManager` 和 `ChessValidation.isMoveLegal()` 不檢查王見王
2. **移動後判定**: `ChessGameService.makeMove()` 執行移動後檢查王見王
3. **立即敗北**: 造成王見王的一方遊戲結束，對方獲勝
4. **AI 智能**: AI 通過 `isInvalidMoveForAI()` 避免造成王見王的移動

**關鍵方法**:
- `ChessGameService.makeMove()`: 522-538行，移動後檢查王見王並設定遊戲結束
- `ChessValidation.wouldKingsFaceEachOther()`: 檢查兩王是否直接面對面
- `ChessValidation.isInvalidMoveForAI()`: AI 專用驗證，包含王見王檢查

### 關鍵服務與責任

#### ChessGameService (chess-game.service.ts)

- **職責**: 遊戲邏輯核心 + AI 整合入口，專注於高層次的遊戲邏輯協調
- **設計理念**: 保持簡潔，將具體實作委託給專門的工具類和驗證模組
- **新增功能**: `makeAIMove()` 統一 AI 移動處理，整合策略決策與驗證邏輯
- **關鍵方法**:
  - `initializeGameState()`: 初始化遊戲狀態
  - `makeMove(gameState, from, to)`: 執行並驗證玩家移動
  - `makeAIMove(gameState, aiStrategy)`: 統一的 AI 移動入口 (新增)
  - `getPossibleMoves(piece, board)`: 委託給 PieceMovesManager 計算棋子可行移動
  - 所有驗證方法委託給 `ChessValidation` 統一處理
- **快取管理**: 使用 LRUCache 和 BoardCache 提升性能
- **AI 整合**: 統一管理 AI 策略調用和移動驗證

#### Utils 工具模組 (utils/)

**ChessValidation (utils/chinese-chess-validation.ts)**

- **職責**: 統一管理所有象棋規則驗證邏輯，提供靜態方法
- **設計理念**: 集中驗證邏輯，但不阻擋王見王移動，允許玩家執行此類移動
- **核心驗證方法**:
  - `isMoveLegal(move, gameState)`: 核心移動合法性檢查（僅送死檢查，不含王見王）
  - `isInCheck(board, color)`: 檢查是否被將軍
  - `wouldKingsFaceEachOther(board)`: 檢查是否會造成王見王（用於移動後判定）
  - `isCheckmate(board, color)`: 檢查是否為將死
  - `isStalemate(board, color)`: 檢查是否為和棋
- **輔助方法**:
  - `getAllPossibleMoves(gameState, color)`: 獲取所有可能移動
  - `getAllLegalMoves(gameState, color)`: 獲取所有合法移動（不過濾王見王）
  - `simulateMove(gameState, move)`: 模擬移動（不修改原狀態）
  - `getRandomLegalMove(gameState, color)`: 獲取隨機合法移動
- **專業 AI 驗證**: `isInvalidMoveForAI()` 專門用於 AI 策略，包含王見王檢查

**PieceMovesManager (utils/chinese-chess-piece-moves.ts)**

- **職責**: 統一管理所有棋子的移動邏輯，提供靜態方法
- **設計理念**: 純棋子走法邏輯，不包含王見王阻擋，允許玩家移動造成王見王
- **關鍵方法**:
  - `getPieceMoves(piece, board, checkKingFacing)`: 統一入口，根據棋子類型分發到對應方法
  - `getKingMoves()`: 將帥走法 (宮殿內一格，保留王見王檢查用於將軍計算)
  - `getAdvisorMoves()`: 士仕走法 (宮殿內斜向一格)
  - `getElephantMoves()`: 象相走法 (本方陣地斜向兩格，不塞象眼)
  - `getHorseMoves()`: 馬走法 (日字形，不蹩馬腿)
  - `getRookMoves()`: 車走法 (橫豎直線)
  - `getCannonMoves()`: 砲走法 (跳砲吃子)
  - `getSoldierMoves()`: 兵卒走法 (過河前向前，過河後可橫向)

**LRUCache (utils/lru-cache.ts)**

- **職責**: 提供 LRU (Least Recently Used) 快取功能
- **設計特點**: 泛型實現，支援任意鍵值類型
- **關鍵方法**:
  - `get(key)`: 取得快取值，自動更新使用順序
  - `set(key, value)`: 設定快取值，自動清理過期項目
  - `clear()`: 清空快取
- **應用**: 快取棋子移動計算結果，減少重複計算

**ChessValues (utils/chess-values.ts)**

- **職責**: XQWLight 引擎的評分表和遊戲常數
- **內容**: 棋子價值、位置獎勵表、搜尋配置等

**ChessOpenings (utils/chess-openings.ts)**

- **職責**: 開局庫管理 (可選功能)
- **功能**: 提供常見開局變化和棋譜記錄

#### BoardCache (board-cache.interface.ts)

- **職責**: 棋盤狀態快取介面和工具方法
- **設計特點**: 快取王位置和各色棋子列表，提升查詢效能
- **核心結構**:
  - `kingPositions`: 各顏色王的位置快取
  - `piecesByColor`: 各顏色棋子列表快取
  - `lastMoveCount`: 快取版本控制
- **工具方法**: `BoardCacheUtils` 提供建立、重置、更新檢查等功能

#### ChessAIService (chess-ai.service.ts)

- **職責**: AI 服務統一介面，委託給 AIStrategyCoordinator
- **關鍵方法**:
  - `makeAIMove(gameState)`: 執行 AI 移動
  - `setAIMode()`: 設置 AI 模式
  - `setDifficulty()`: 設置難度

#### AIStrategyCoordinator (chess-ai/ai-strategy-coordinator.ts)

- **職責**: 協調多種 AI 策略，按優先級選擇可用策略
- **策略優先級**: XQWLight (1) → Gemini AI (2)
- **關鍵方法**:
  - `executeAIMove()`: 執行策略選擇和移動
  - `setAIMode()`: 控制啟用的策略
  - `getEmergencyMove()`: 緊急備案移動

#### XQWLightStrategy (chess-ai/xqwlight-strategy.ts)

- **職責**: XQWLight 專業引擎實作，使用 Alpha-Beta 搜尋
- **核心特性**:
  - 使用 XQWLight 原版評分表和位置價值表
  - Alpha-Beta 搜尋 + 移動排序 (MVV-LVA + 殺手移動 + 歷史表)
  - 3-7 層可調搜尋深度，8 秒思考時間限制
  - 專業移動驗證 (避免送死、王見王等)

### XQWLight 評估系統 (chess-values.ts)

#### 棋子價值表 (PIECE_VALUES)

```typescript
KING: 10000, ROOK: 600, CANNON: 300, HORSE: 300,
ADVISOR: 20, ELEPHANT: 20, SOLDIER: 100
```

#### 位置價值表 (POSITION_VALUES)

- 每種棋子都有 10x9 的位置獎勵表
- 紅方需要 Y 軸鏡像翻轉 (9-y)
- 實現了 XQWLight 原版的專業評估

#### 搜尋配置 (XQWLIGHT_CONFIG)

```typescript
DEPTHS: { easy: 3, medium: 5, hard: 7 }
MAX_TIME: 8000ms
INFINITY: 20000, MATE_VALUE: 10000
```

### 命名規範與變數約定

#### 函數命名

- `getPossibleMoves()`: 獲取可行移動
- `makeMove()`: 執行移動
- `isInCheck()`: 檢查將軍狀態
- `evaluatePosition()`: 位置評估
- `simulateMove()`: 模擬移動

#### 變數命名

- `gameState`: 遊戲狀態物件
- `currentPlayer`: 當前玩家 (RED/BLACK)
- `selectedPiece`: 選中的棋子
- `validMoves`: 有效移動陣列
- `moveHistory`: 移動歷史陣列
- `aiState`: AI 狀態 (isThinking, thinkingText)

#### 常數命名

- `BOARD_WIDTH: 9`, `BOARD_HEIGHT: 10`
- `PALACE_LEFT: 3`, `PALACE_RIGHT: 5`
- `RED_PALACE_TOP: 7`, `BLACK_PALACE_TOP: 0`
- `PIECE_VALUES`, `POSITION_VALUES`
- `XQWLIGHT_CONFIG`, `MOVE_ORDER_WEIGHTS`

## Token 優化指引

- 優先使用現有檔案，避免建立新檔案
- 使用 Grep 和 Glob 工具進行精確搜尋
- 避免讀取大型或不必要的檔案
- 簡潔回應，避免冗長解釋
- 使用 Task 工具處理複雜搜尋任務
- 完成任務後請主動詢問是否需要更新此檔案

## 程式碼品質檢查清單

### 程式碼品質

- 程式碼符合命名規範
- 沒有硬編碼的魔術數字或字串
- 函數長度合理（建議 < 50 行）
- 複雜邏輯有適當註解說明
- 沒有重複程式碼（DRY 原則）
- 變數和函數名稱語意清楚

### 文件更新

- README 安裝說明已更新（如適用）
- 技術規格文件已同步
- 變更記錄已記錄
- 用戶操作說明已更新（如適用）

## 維護提醒

- 完成新功能時請要求更新此檔案
- 變更架構或技術棧時需同步更新
- 新增遊戲或重要元件時請更新遊戲列表
