# 中國象棋 AI 引擎選項分析

## 目前問題
現有的自寫 Minimax 算法存在嚴重問題：
- AI 會做出明顯的送死移動
- 搜尋邏輯不夠成熟
- 評估函數過於簡化
- 缺乏專業棋譜訓練

## 建議解決方案

### 選項一：XiangQi Wizard Light (推薦)
**GitHub**: https://github.com/xqbase/xqwlight
- ✅ 經過驗證的專業引擎
- ✅ 支援 JavaScript 實作
- ✅ GPL-2.0 開源授權
- ✅ 跨平台支援 (C++, Java, JavaScript, ActionScript)
- ✅ "Simple but Strong" 設計理念

**優勢**:
- 成熟穩定的 AI 算法
- 已經過大量測試
- 棋力可靠，不會做愚蠢移動
- 程式碼品質高

### 選項二：Xiangqi-R1 (2025最新)
**論文**: https://arxiv.org/abs/2507.12215
- 🧠 7B 參數的 LLM 模型
- 🚀 基於 Qwen-2.5-7B-Instruct 微調
- 📈 18% 移動合法性提升，22% 分析準確度提升
- 🎯 強化學習訓練 (GRPO)

**限制**:
- 需要大量計算資源
- 模型檔案過大
- 不適合純前端應用

### 選項三：無搜尋AI (2024研究)
**特色**: 無需搜尋算法的高性能AI
- ⚡ QPS 比 MCTS 快1000倍
- 🏆 達到人類前0.1%水準
- 🔬 監督學習 + 強化學習

**限制**:
- 學術研究階段
- 未開源實作
- 整合困難

## 推薦方案：整合 XQWLight 引擎

### 實作策略
1. **下載 XQWLight JavaScript 版本**
2. **包裝成 Angular Service**
3. **保持現有 UI 不變**
4. **替換底層 AI 引擎**

### 整合步驟
```typescript
// 新的 XQWLight AI 策略
export class XQWLightStrategy extends BaseAIStrategy {
  readonly name = 'XQWLight 專業引擎';
  readonly priority = 1; // 最高優先級

  async makeMove(gameState: GameState): Promise<AIStrategyResult | null> {
    // 整合 XQWLight 引擎邏輯
    const move = this.xqwlight.searchMove(gameState.board);
    return {
      from: move.from,
      to: move.to,
      score: move.score,
      analysis: 'XQWLight 專業引擎'
    };
  }
}
```

### 預期效果
- ❌ **目前**: AI 做愚蠢移動，5步輸棋
- ✅ **改進後**: 專業水準，穩定可靠
- 🎯 **棋力**: 達到業餘強手水準
- ⚡ **性能**: 快速響應，適合網頁遊戲

## 結論
建議立即替換成 XQWLight 引擎，這是最實際且可靠的解決方案。自寫算法雖然有學習價值，但在實際應用中應該使用經過驗證的專業引擎。

## 下一步行動
1. 研究 XQWLight JavaScript 實作
2. 設計整合方案
3. 替換現有 AI 引擎
4. 測試棋力改進效果