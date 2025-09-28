# 中國象棋檔案架構與邏輯

## 核心檔案結構

```
src/app/chinese-chess/
├── chinese-chess.ts                    # 主元件 (UI 控制器)
├── chinese-chess.service.ts           # 遊戲邏輯核心服務
├── chinese-chess-ai.service.ts        # AI 服務統一介面
├── chinese-chess-piece.interface.ts   # 型別定義和介面
├── board-cache.interface.ts           # 棋盤快取介面和工具
├── utils/                             # 工具類和公用函數
│   ├── chinese-chess-validation.ts   # 象棋規則驗證模組
│   ├── chinese-chess-config.ts       # XQWLight 配置和常數
│   ├── chinese-chess-piece-moves.ts  # 棋子走法管理類
│   ├── chinese-chess-openings.ts     # 開局定式和戰略
│   └── lru-cache.ts                  # LRU 快取實現
├── strategies/                        # AI 策略模組
│   ├── base-strategy.ts              # 策略基類
│   ├── strategy-service.ts           # 策略管理服務
│   ├── xqwlight-strategy.ts          # XQWLight 專業引擎
│   └── gemini-ai-strategy.ts         # Gemini AI 策略
└── gemini-api-key/                    # API 金鑰管理元件
    └── gemini-api-key.component.ts
```

## 核心型別定義

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
  status: GameResult; // 遊戲狀態 (將軍/將死/和棋)
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

## 核心邏輯流程

### 1. 遊戲初始化流程

```
ChineseChess.ngOnInit()
→ resetGame()
→ ChineseChessService.initializeGameState()
→ 初始化 9x10 棋盤、放置棋子、設置遊戲狀態
```

### 2. 玩家移動處理流程

```
玩家點擊棋盤
→ onSquareClick(x, y)
→ handleSelectedPieceClick() / handleInitialPieceClick()
→ selectPiece() / makeMove()
→ ChineseChessService.makeMove(gameState, from, to)
→ 驗證移動、更新棋盤、檢查遊戲狀態
→ processMoveResult() → 切換玩家、更新歷史、觸發AI
```

### 3. AI 思考與移動流程

```
triggerAIMove()
→ ChineseChessAiService.makeAIMove(gameState)
→ StrategyService.executeAIMove(gameState)
→ AI 策略決策 + 移動驗證 + 執行移動
→ processAIMoveResult()
```

## 王見王規則實現

**核心規則**: 玩家可以移動造成王見王，但移動後造成王見王的一方立即敗北

**實現邏輯**:
- 移動前不阻擋王見王移動
- 移動後檢查王見王並判定勝負
- AI 會避免造成王見王的移動

## 核心服務架構

### 主要服務職責

- **ChineseChessService**: 遊戲邏輯核心，統一管理移動驗證和 AI 整合
- **ChessValidation**: 象棋規則驗證，包含將軍、將死、王見王判定
- **PieceMovesManager**: 棋子走法邏輯，處理各種棋子的移動規則
- **ChineseChessConfig**: 配置管理模組，包含 XQWLight 常數和遊戲參數
- **ChineseChessOpenings**: 開局定式和戰略模組，包含常見開局與變化
- **ChineseChessAiService**: AI 服務介面，協調不同 AI 策略
- **StrategyService**: 策略管理服務，協調多種 AI 策略
- **XQWLightStrategy**: 專業 AI 引擎，使用 Alpha-Beta 搜尋算法

### 效能優化

- **LRUCache**: 快取移動計算結果
- **BoardCache**: 快取王位置和棋子列表
- **Signal 架構**: Angular 響應式狀態管理

## XQWLight AI 引擎

### 核心特性
- **Alpha-Beta 搜尋**: 專業搜尋算法
- **動態難度**: 3-7 層搜尋深度 (簡單/中等/困難)
- **時間限制**: 最多 8 秒思考時間
- **評分系統**: XQWLight 原版棋子價值表和位置評估

### 棋子價值
```typescript
KING: 10000, ROOK: 600, CANNON: 300, HORSE: 300,
ADVISOR: 20, ELEPHANT: 20, SOLDIER: 100
```

## UI/UX 特色

### 統計區塊功能
- **當前對戰**: 顯示人機/雙人模式
- **當前回合**: 紅方/黑方指示
- **最後一步**: 顯示最新棋譜
- **目前難度**: AI 難度設定
- **棋譜記錄**: 整合式棋譜查看按鈕

### 棋譜系統
- **浮動彈窗**: 全螢幕棋譜記錄查看
- **步數統計**: 實時顯示棋譜步數
- **移動歷史**: 完整的對局記錄