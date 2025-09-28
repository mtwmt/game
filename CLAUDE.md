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
- `src/app/shared/` - 共享元件目錄
  - `components/game-header/` - 遊戲標題元件 (包含遊戲規則彈窗功能)
- `src/server.ts` - Express SSR 伺服器設定

### 遊戲實作模式

遊戲以獨立的 Angular 元件實作，具備：

- 基於 Signal 的響應式狀態管理
- 觸控/鍵盤控制與方向驗證
- 使用 `setInterval` 的遊戲循環，並在 `ngOnDestroy` 中清理
- 響應式設計與行動裝置專用控制
- TailwindCSS 主題類別 (復古風格用 lime/green，霓虹風格用 fuchsia/cyan)
- 統一的遊戲標題元件 (GameHeaderComponent) 包含：
  - GitHub Star 按鈕 (支援暗色主題)
  - HOME 返回按鈕
  - 遊戲規則彈窗功能 (可選)

### 程式碼慣例

- 使用 Angular signals 進行狀態管理，而非傳統的 RxJS observables
- 元件使用 `protected` 可見性給範本可存取的成員
- 獨立元件與明確引入
- SCSS 樣式搭配 TailwindCSS 工具類別
- 遊戲實體的 TypeScript 介面 (Position, Direction 型別)

### 遊戲規則系統

#### GameHeaderComponent 遊戲規則功能

每個遊戲都透過 `GameHeaderComponent` 提供統一的遊戲規則查看功能：

**使用方式**：

```typescript
// 在遊戲元件中定義規則
protected readonly gameRules: GameRule = {
  title: '遊戲名稱規則',
  rules: [
    '規則說明 1',
    '規則說明 2',
    // ...
  ]
};
```

```html
<!-- 在範本中傳遞規則 -->
<app-game-header title="遊戲名稱" [gameRules]="gameRules"></app-game-header>
```

**功能特色**：

- 標題旁邊的問號圖示按鈕
- 點擊後彈出全螢幕規則說明彈窗
- 支援編號列表形式的規則展示
- 響應式設計，適配手機和桌面
- 可選功能：不傳入 gameRules 則不顯示按鈕

### 目前遊戲

- **貪食蛇 (Snake)**: 完整實作，包含暫停/繼續、觸控控制、碰撞偵測、遊戲規則說明
- **寵物連連看 (Pet Connect)**: 已實作基礎遊戲功能、限時機制、重力補位、遊戲規則說明
- **中國象棋 (Chinese Chess)**: 完整象棋遊戲，搭載 XQWLight 專業引擎、棋譜浮動按鈕、遊戲規則說明
  - XQWLight 原版 Alpha-Beta 搜尋引擎
  - 3-7 層可調搜尋深度，8 秒思考時間限制
  - 專業移動驗證和 AI 策略系統
  - **詳細架構說明**: 參見 `src/app/chinese-chess/README.md`

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

## 文件維護指引

### 模組 README 維護

當對以下模組進行重大更新時，請同步更新對應的 README：

- `src/app/chinese-chess/` → 更新 `src/app/chinese-chess/README.md`
- `src/app/pet-match/` → 更新 `src/app/pet-match/README.md`
- `src/app/snake/` → 如有重大架構變更，考慮新增 README
- **新遊戲開發** → 建議為複雜遊戲創建專屬 README

### 需要更新 README 的情況

**核心架構變更**：

- 新增核心服務或重要類別
- 修改主要的遊戲邏輯流程
- 變更 API 介面或型別定義
- 架構重構或設計模式變更

**功能新增**：

- 新增重要的 UI/UX 功能
- 加入新的遊戲機制或規則
- 實作新的 AI 策略或演算法
- 加入效能優化或快取系統

**文件結構建議**：

- 簡單遊戲（如 Snake）：可不需要 README
- 中等複雜度（如 Pet Match）：建議有 README
- 複雜遊戲（如 Chinese Chess）：必須有詳細 README

### 主文件 (CLAUDE.md) 維護

- 完成新功能時請要求更新此檔案
- 變更架構或技術棧時需同步更新
- 新增遊戲或重要元件時請更新遊戲列表
- 新增共享元件時需更新架構說明
