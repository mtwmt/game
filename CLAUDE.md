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
  - `strategies/minimax-strategy.ts` - 備用 Minimax 算法
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
  - 3-7層搜尋深度 (可調難度)
  - 8秒思考時間上限
  - 經過驗證的專業棋力

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

## 最近更新記錄

### 2025-09-27 - 整合 XQWLight 專業引擎

- 完全替換為 XQWLight 原版引擎
- 使用 XQWLight 經典評分表和位置價值表
- 實作專業 Alpha-Beta 搜尋算法
- 專業移動排序 (MVV-LVA + 殺手移動 + 歷史表)
- 3-7層可調搜尋深度，8秒思考時間
- 捨棄自寫算法，改用經過驗證的專業引擎
- AI 棋力達到專業水準，徹底解決送死問題
