import { Injectable } from '@angular/core';
import { BaseAIStrategy, AIStrategyResult } from './base-ai-strategy';
import { PlayerColor, GameState, PieceType } from '../chess-piece.interface';
import { ChessValidation } from '../utils/chinese-chess-validation';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable({
  providedIn: 'root'
})
export class GeminiAIStrategy extends BaseAIStrategy {
  readonly name = 'Gemini AI';
  readonly priority = 2;

  async isAvailable(): Promise<boolean> {
    const apiKey = typeof localStorage !== 'undefined' ?
      localStorage.getItem('gemini-api-key') : null;
    return !!(apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE');
  }

  async makeMove(gameState: GameState): Promise<AIStrategyResult | null> {
    try {
      // 檢查 API Key 是否已設置
      const userApiKey = typeof localStorage !== 'undefined' ?
        localStorage.getItem('gemini-api-key') : null;
      const apiKey = userApiKey;

      if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
        console.log('❌ Gemini API Key 未設置，請在設定中輸入 API Key');
        return null;
      }

      // 使用 Google Generative AI SDK
      console.log(
        '🔑 使用 API Key:',
        apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : '無'
      );
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
      console.log('📡 準備呼叫 Gemini API...');

      const prompt = this.createGeminiPrompt(gameState);
      console.log('🚀 正在呼叫 Gemini API...');
      const result = await model.generateContent(prompt);
      console.log('✅ Gemini API 呼叫成功！');
      const response = await result.response;
      const text = response.text();
      console.log('📝 Gemini 回應長度:', text?.length || 0);

      if (!text) {
        console.log('❌ Gemini 沒有返回有效回應');
        return null;
      }

      // 嘗試解析 JSON 回應
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const geminiResponse = JSON.parse(jsonMatch[0]);

          // 驗證回應結構
          if (!this.isValidGeminiResponse(geminiResponse)) {
            console.warn('❌ Gemini 回應格式無效');
            return null;
          }
        console.log('🤖 Gemini 分析:', geminiResponse.analysis);
        console.log('🤖 選擇理由:', geminiResponse.reasoning);

        // 驗證移動是否有效
        const possibleMoves = this.getAllPossibleMoves(gameState, PlayerColor.BLACK);
        const move = geminiResponse.move;
        if (this.isValidMove(move, possibleMoves)) {
          return {
            from: move.from,
            to: move.to,
            analysis: `${geminiResponse.analysis} - ${geminiResponse.reasoning}`
          };
        } else {
          console.log('❌ Gemini 提供的移動無效');
        }
        } catch (parseError) {
          console.error('❌ 無法解析 Gemini JSON 回應:', parseError);
          return null;
        }
      }
    } catch (error) {
      console.error('❌ Gemini API 調用失敗:', error);
    }

    return null;
  }

  getThinkingDescription(): string {
    return '🤖 Gemini AI 正在分析棋局...';
  }

  private createGeminiPrompt(gameState: GameState): string {
    const boardDescription = this.describeBoardState(gameState);
    const possibleMoves = this.getAllPossibleMoves(gameState, PlayerColor.BLACK);
    const movesDescription = this.describeValidMoves(possibleMoves);

    return `
You are a professional Chinese Chess AI. Please analyze the current board state and choose the best move.

Board state (RED at bottom, BLACK at top, coordinates start from 0,0):
${boardDescription}

Available moves:
${movesDescription}

Please analyze the position and choose the best move. Response must be in JSON format:
{
  "analysis": "Your analysis process",
  "move": {
    "from": {"x": start_x_coordinate, "y": start_y_coordinate},
    "to": {"x": target_x_coordinate, "y": target_y_coordinate}
  },
  "reasoning": "Reason for choosing this move"
}

Important notes:
1. You are BLACK player, choose moves that benefit BLACK
2. Coordinate system: x is column (0-8), y is row (0-9)
3. You can only choose from the provided available moves
4. Priority: capturing, checking, position improvement, defense
5. You have maximum 10 seconds thinking time
6. Please respond in Traditional Chinese
`;
  }

  private describeBoardState(gameState: GameState): string {
    let description = '';
    for (let y = 0; y < 10; y++) {
      let row = `Row ${y}: `;
      for (let x = 0; x < 9; x++) {
        const piece = gameState.board[y][x];
        if (piece) {
          const color = piece.color === PlayerColor.RED ? 'RED' : 'BLACK';
          row += `(${x},${y}):${color}_${piece.type} `;
        }
      }
      description += row + '\n';
    }
    return description;
  }

  private describeValidMoves(moves: { from: { x: number; y: number }; to: { x: number; y: number } }[]): string {
    return moves
      .map(
        (move, index) =>
          `${index + 1}. Move from (${move.from.x},${move.from.y}) to (${move.to.x},${move.to.y})`
      )
      .join('\n');
  }

  private isValidGeminiResponse(response: any): boolean {
    return (
      response &&
      typeof response === 'object' &&
      response.move &&
      typeof response.move === 'object' &&
      response.move.from &&
      typeof response.move.from === 'object' &&
      typeof response.move.from.x === 'number' &&
      typeof response.move.from.y === 'number' &&
      response.move.to &&
      typeof response.move.to === 'object' &&
      typeof response.move.to.x === 'number' &&
      typeof response.move.to.y === 'number' &&
      typeof response.analysis === 'string' &&
      typeof response.reasoning === 'string'
    );
  }

  // ==========================================
  // 使用 ChessValidation 統一驗證模組
  // ==========================================

  /**
   * 獲取所有可能移動（使用統一驗證模組）
   */
  private getAllPossibleMoves(
    gameState: GameState,
    color: PlayerColor
  ): { from: { x: number; y: number }; to: { x: number; y: number } }[] {
    const moves = ChessValidation.getAllPossibleMoves(gameState, color);
    return moves.map(move => ({
      from: { x: move.from.x, y: move.from.y },
      to: { x: move.to.x, y: move.to.y }
    }));
  }

  /**
   * 檢查移動是否在可能移動列表中（使用統一驗證模組）
   */
  private isValidMove(
    move: { from: { x: number; y: number }; to: { x: number; y: number } },
    possibleMoves: { from: { x: number; y: number }; to: { x: number; y: number } }[]
  ): boolean {
    return ChessValidation.isValidMove(
      { from: move.from, to: move.to },
      possibleMoves.map(m => ({ from: m.from, to: m.to }))
    );
  }
}