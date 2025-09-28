# 寵物連連看檔案架構與邏輯

## 核心檔案結構

```
src/app/pet-match/
├── pet-match.ts                     # 主元件 (UI 控制器和遊戲狀態管理)
├── pet-match.html                   # 範本檔案 (響應式遊戲介面)
├── pathfinding.service.ts           # 路徑尋找服務 (連線算法實作)
├── game-logic.service.ts            # 遊戲邏輯服務 (關卡管理和重力系統)
└── pet-match.scss                   # 樣式檔案 (遊戲視覺效果)
```

## 核心型別定義

```typescript
// 基礎介面
interface Tile {
  id: string;
  petType: number; // 0-11，對應12種不同寵物
  x: number;       // 棋盤 X 座標 (0-5)
  y: number;       // 棋盤 Y 座標 (0-8)
  isSelected: boolean;
  isMatched: boolean;
}

// 路徑片段
interface PathSegment {
  x: number;
  y: number;
  width: number;
  height: number;
  isHorizontal: boolean;
}

// 關卡類型
enum LevelType {
  CLASSIC = 'classic',      // 第一關：不補位
  GRAVITY_DOWN = 'down',    // 第二關：向下補位
  GRAVITY_UP = 'up',        // 第三關：向上補位
  GRAVITY_LEFT = 'left',    // 第四關：向左補位
  GRAVITY_RIGHT = 'right'   // 第五關以後：向右補位
}
```

## 核心系統架構

### 1. 遊戲狀態管理 (pet-match.ts)

**主要 Signals**:
```typescript
protected readonly board = signal<(Tile | null)[][]>([]);           // 6x9 棋盤陣列
protected readonly selectedTiles = signal<Tile[]>([]);              // 選中的方塊 (最多2個)
protected readonly score = signal(0);                               // 當前分數
protected readonly level = signal(1);                               // 當前關卡
protected readonly moves = signal(0);                               // 移動次數
protected readonly gameTime = signal(0);                            // 遊戲總時間
protected readonly countdownTime = signal(300);                     // 倒數計時 (5分鐘)
protected readonly gameOver = signal(false);                        // 遊戲結束狀態
protected readonly levelComplete = signal(false);                   // 關卡完成狀態
protected readonly gameComplete = signal(false);                    // 全破關狀態
```

**重力補位系統**:
- 不同關卡有不同的重力方向
- 消除方塊後會觸發對應方向的補位
- 補位動畫與遊戲邏輯分離

### 2. 路徑尋找系統 (pathfinding.service.ts)

**演算法核心**:
```typescript
// 主要尋路方法
findPath(board: (Tile | null)[][], tile1: Tile, tile2: Tile): PathSegment[]

// 路徑驗證規則
- 最多2次轉彎 (3個線段)
- 路徑不能被其他方塊阻擋
- 支援邊界延伸尋路
```

**尋路策略**:
1. **直線連接** - 檢查水平或垂直直線路徑
2. **一次轉彎** - L型路徑
3. **兩次轉彎** - Z型路徑
4. **邊界延伸** - 利用棋盤邊界的虛擬空間

### 3. 遊戲邏輯服務 (game-logic.service.ts)

**關卡管理**:
```typescript
generateLevel(level: number): (Tile | null)[][]
applyGravity(board: (Tile | null)[][], levelType: LevelType): void
getRemainingTileCount(board: (Tile | null)[][]): number
formatTime(seconds: number): string
```

**重力系統實作**:
- **CLASSIC**: 無重力，消除後留空
- **GRAVITY_DOWN**: 方塊向下掉落
- **GRAVITY_UP**: 方塊向上飄移
- **GRAVITY_LEFT**: 方塊向左滑動
- **GRAVITY_RIGHT**: 方塊向右滑動

## 遊戲流程邏輯

### 1. 遊戲初始化

```
ngOnInit()
→ resetGame()
→ GameLogicService.generateLevel(1)
→ 生成6x9棋盤，放置隨機寵物
→ 啟動倒數計時器
```

### 2. 玩家互動處理

```
玩家點擊方塊
→ onTileClick(tile)
→ 檢查是否可選擇
→ 更新 selectedTiles
→ 如果選擇2個方塊：
  → PathfindingService.findPath()
  → 如果路徑存在：
    → 顯示連線動畫
    → 消除方塊
    → 觸發重力補位
    → 更新分數和移動次數
    → 檢查關卡完成條件
```

### 3. 關卡進程管理

```
checkLevelComplete()
→ 如果 remainingTiles === 0：
  → 設置 levelComplete = true
  → 計算關卡獎勵分數
  → 如果 level >= 5：
    → 設置 gameComplete = true
  → 否則：
    → 準備下一關
```

## 計分系統

### 基礎分數
- **成功配對**: 100分
- **連續配對獎勵**: 額外50分 (連續配對時)
- **時間獎勵**: 剩餘時間 × 2分
- **移動效率獎勵**: 基於移動次數的效率分數

### 道具系統
- **重排功能**: 最多3次，重新洗牌所有方塊
- **提示功能**: 最多3次，顯示可配對的方塊
- **道具使用**: 不影響分數，但計入統計

## UI/UX 設計特色

### 響應式設計
- **手機優先**: 基於 `max-w-sm` 的緊湊設計
- **觸控友善**: 適當的觸控目標大小 (48px)
- **統計區塊**: 整合式遊戲狀態顯示

### 視覺回饋
- **選擇狀態**: 紫色邊框和背景高亮
- **連線動畫**: 路徑片段的脈衝動畫效果
- **消除效果**: 方塊消失的淡出動畫
- **重力動畫**: 方塊移動的流暢過渡

### 統計區塊功能
```typescript
// 統計資訊展示
- 關卡進度 (cyan)
- 當前分數 (lime)
- 移動次數 (yellow)
- 剩餘方塊 (orange)
- 已選寵物 (purple) - 固定寬度設計
- 時間線條 (gradient) - 視覺化倒數計時
```

## 效能優化

### Signal 響應式架構
- 使用 Angular Signals 實現高效的狀態更新
- Computed 自動計算衍生狀態
- 最小化不必要的重新渲染

### 記憶體管理
- 定時器清理：`ngOnDestroy` 中清除所有計時器
- 事件監聽器管理：適當的綁定和解綁
- 方塊物件重用：減少物件創建開銷

### 路徑尋找優化
- 早期終止：找到路徑後立即返回
- 邊界檢查：避免無效的路徑探索
- 路徑快取：同一回合內的路徑結果快取

## 遊戲難度設計

### 關卡進程
1. **第1關**: 經典模式，無重力補位
2. **第2關**: 下重力，增加動態元素
3. **第3關**: 上重力，反向思考
4. **第4關**: 左重力，橫向策略
5. **第5關**: 右重力，完整挑戰

### 時間管理
- **關卡限時**: 每關5分鐘
- **時間壓力**: 視覺化倒數提醒
- **時間獎勵**: 快速完成有額外分數

## 程式碼結構原則

### 關注點分離
- **pet-match.ts**: UI 控制和狀態管理
- **pathfinding.service.ts**: 純演算法邏輯
- **game-logic.service.ts**: 遊戲規則和關卡生成

### 可測試性
- 服務層邏輯與 UI 分離
- 純函數設計便於單元測試
- 狀態變更的可預測性

### 可擴展性
- 新增寵物類型：調整 `petTypes` 常數
- 新增關卡模式：擴展 `LevelType` 枚舉
- 新增道具功能：擴展道具系統架構