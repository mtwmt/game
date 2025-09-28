# 踩地雷遊戲架構與邏輯

## 核心檔案結構

```
src/app/minesweeper/
├── minesweeper.ts                    # 主元件 (UI 控制器)
├── minesweeper.html                  # 遊戲範本 (TailwindCSS)
├── minesweeper.scss                  # 樣式檔案
├── minesweeper.service.ts            # 遊戲邏輯核心服務
├── minesweeper.interface.ts          # 型別定義和介面
└── utils/                            # 工具模組
    ├── minesweeper-config.ts         # 遊戲配置和常數
    ├── minesweeper-validation.ts     # 遊戲規則驗證
    └── minesweeper-mine-generator.ts # 地雷生成和計算
```

## 核心型別定義

```typescript
// 基礎介面
interface Position {
  x: number;
  y: number;
}

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

// 列舉類型
enum GameStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  WON = 'won',
  LOST = 'lost',
}

enum Difficulty {
  BEGINNER = 'beginner',      // 9x9, 10 地雷
  INTERMEDIATE = 'intermediate', // 16x16, 40 地雷
  EXPERT = 'expert',          // 30x16, 99 地雷
  CUSTOM = 'custom',
}
```

## 核心邏輯流程

### 1. 遊戲初始化流程

```
MinesweeperComponent.ngOnInit()
→ MinesweeperService.initializeGame()
→ 創建空的遊戲板、設置遊戲狀態
```

### 2. 玩家移動處理流程

```
玩家點擊格子
→ onCellClick(position)
→ MinesweeperService.revealCell(position)
→ 第一次點擊時初始化地雷 → initializeMines()
→ 遞歸揭開格子 → revealCellRecursive()
→ 檢查遊戲狀態 → 勝利/失敗判定
```

### 3. 地雷生成流程

```
initializeMines(firstClickPosition)
→ MineGenerator.generateMinePositions()
→ 避開第一次點擊位置及鄰近區域
→ 隨機分布地雷
→ MineGenerator.calculateNeighborMineCounts()
→ 計算每個格子的鄰近地雷數量
```

## 遊戲規則實現

### 第一次點擊保護

**核心規則**: 第一次點擊保證不會踩到地雷

**實現邏輯**:
- 遊戲開始時不放置地雷
- 第一次點擊後才根據點擊位置生成地雷
- 排除第一次點擊位置及其8個鄰近格子

### 空白區域展開

**核心規則**: 點擊空白格子（鄰近地雷數為0）會自動展開相鄰的空白區域

**實現邏輯**:
- 使用遞歸算法 `revealCellRecursive()`
- 檢查鄰近8個方向的格子
- 如果鄰近格子也是空白，繼續遞歸展開

## 核心服務架構

### 主要服務職責

- **MinesweeperService**: 遊戲邏輯核心，統一管理遊戲狀態和操作
- **MinesweeperValidation**: 遊戲規則驗證，包含位置驗證、移動驗證、勝負判定
- **MineGenerator**: 地雷生成和計算，包含地雷位置生成和鄰近計算
- **Config**: 配置管理，包含不同難度設定和遊戲常數

### 效能優化

- **Signal 架構**: Angular 響應式狀態管理
- **格子 ID**: 唯一識別符優化 Angular 追蹤
- **事件防抖**: 避免重複點擊操作

## 難度設定

### 預設難度

| 難度 | 棋盤大小 | 地雷數量 | 說明 |
|------|----------|----------|------|
| 初級 | 9×9 | 10 | 適合新手，基礎邏輯練習 |
| 中級 | 16×16 | 40 | 標準難度，需要策略思考 |
| 專家 | 30×16 | 99 | 高難度，需要高級技巧 |

### 自訂難度

- 支援自訂棋盤大小（5×5 到 50×50）
- 支援自訂地雷數量（最少1個，最多不超過總格數-1）

## UI/UX 特色

### 統計區塊功能

- **剩餘地雷數**: 總地雷數 - 已標記旗標數
- **遊戲時間**: 從第一次點擊開始計時
- **遊戲進度**: 已揭開格子 / 總非地雷格子的百分比

### 觸控支援

- **點擊**: 揭開格子
- **右鍵點擊**: 標記/取消標記旗標
- **移動端長按**: 標記/取消標記旗標（500ms觸發）
- **觸覺反饋**: 標記時提供震動反饋

### 響應式設計

- **桌面端**: 較大的格子和按鈕
- **平板端**: 中等大小的格子
- **手機端**: 優化的觸控大小和間距

### 數字顏色系統

- **1**: 藍色 - 最常見的數字
- **2**: 綠色 - 相對安全
- **3**: 紅色 - 需要注意
- **4**: 紫色 - 危險區域
- **5**: 黃色 - 高風險
- **6**: 粉色 - 極高風險
- **7**: 黑色 - 危險警告
- **8**: 灰色 - 最高風險

## 技術特色

### 職責分離架構

參考中國象棋的架構模式：
- **介面定義**: 清楚的型別系統
- **服務層**: 遊戲邏輯與UI分離
- **工具層**: 可重用的功能模組
- **驗證層**: 統一的規則驗證

### 遊戲狀態管理

- 使用 Angular Signals 進行響應式狀態管理
- 計算屬性自動更新UI顯示
- 統一的遊戲狀態結構

### 安全性考量

- 所有操作都經過驗證
- 防止無效的移動操作
- 遊戲結束後禁用所有操作