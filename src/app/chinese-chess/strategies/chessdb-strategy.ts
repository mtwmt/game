import { Injectable, inject } from '@angular/core';
import { BaseAIStrategy, AIStrategyResult } from './base-strategy';
import { GameState, Position } from '../chinese-chess-piece.interface';
import { ChineseChessService } from '../chinese-chess.service';

/**
 * ChessDB.cn 雲庫 AI 策略
 * 使用專業象棋雲庫提供的最佳走法
 * 棋力遠超本地引擎，完全免費
 */
@Injectable({
  providedIn: 'root',
})
export class ChessDBStrategy extends BaseAIStrategy {
  readonly name = 'ChessDB 雲庫';
  readonly priority = 0; // 最高優先級

  private chessService = inject(ChineseChessService);
  private readonly API_BASE = 'https://www.chessdb.cn/chessdb.php';
  private readonly TIMEOUT_MS = 5000; // 5秒超時

  // 難度設定
  private difficulty: 'easy' | 'medium' | 'hard' = 'hard';

  async isAvailable(): Promise<boolean> {
    // 檢查網路連線和 API 可用性
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(
        `${this.API_BASE}?action=querybest&board=rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w`,
        {
          signal: controller.signal,
          method: 'GET',
        }
      );

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('⚠️ ChessDB API 不可用:', error);
      return false;
    }
  }

  async makeMove(gameState: GameState): Promise<AIStrategyResult | null> {
    try {
      // 將棋盤轉換為 FEN 格式
      const fen = this.chessService.convertToFEN(gameState);
      console.log(`📡 查詢 ChessDB 雲庫 (難度: ${this.difficulty})...`, fen);

      // 根據難度選擇查詢方式
      const moveData = await this.queryMoveByDifficulty(fen);

      if (!moveData) {
        console.warn('⚠️ ChessDB 未返回有效走法');
        return null;
      }

      // 解析走法並轉換為 Position 格式
      const result = this.parseChessDBMove(moveData, gameState);

      if (result) {
        console.log('✅ ChessDB 推薦走法:', moveData);
      }

      return result;
    } catch (error) {
      console.error('❌ ChessDB 策略錯誤:', error);
      return null;
    }
  }

  getThinkingDescription(): string {
    const difficultyText = {
      easy: '簡單',
      medium: '中等',
      hard: '困難',
    }[this.difficulty];
    return `☁️ 查詢專業象棋雲庫 (${difficultyText})...`;
  }

  /**
   * 設定難度
   */
  setDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
    this.difficulty = difficulty;
    console.log(`☁️ ChessDB 難度設為: ${difficulty}`);
  }

  /**
   * 根據難度查詢走法
   */
  private async queryMoveByDifficulty(fen: string): Promise<string | null> {
    if (this.difficulty === 'hard') {
      // 困難模式：直接查詢最佳走法
      return this.queryBestMove(fen);
    } else {
      // 簡單/中等模式：查詢所有走法後選擇
      return this.queryAllAndSelect(fen);
    }
  }

  /**
   * 查詢 ChessDB 最佳走法 (困難模式)
   */
  private async queryBestMove(fen: string): Promise<string | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const url = `${this.API_BASE}?action=querybest&board=${encodeURIComponent(fen)}`;
      const response = await fetch(url, {
        signal: controller.signal,
        method: 'GET',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();

      // ChessDB 回應格式: "move:e2e4" 或 "unknown" 或 "checkmate"
      if (text.includes('move:')) {
        return text.split('move:')[1].trim();
      }

      // 處理特殊情況
      if (text.includes('unknown')) {
        console.warn('⚠️ ChessDB: 位置不在資料庫中');
      } else if (text.includes('checkmate')) {
        console.log('🏆 ChessDB: 已將死');
      } else if (text.includes('stalemate')) {
        console.log('🤝 ChessDB: 和局');
      }

      return null;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('⚠️ ChessDB 請求超時');
      } else {
        console.error('❌ ChessDB 請求失敗:', error);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 查詢所有走法並根據難度選擇 (簡單/中等模式)
   */
  private async queryAllAndSelect(fen: string): Promise<string | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const url = `${this.API_BASE}?action=queryall&board=${encodeURIComponent(fen)}`;
      const response = await fetch(url, {
        signal: controller.signal,
        method: 'GET',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();

      // ChessDB queryall 回應格式: "move:e2e4|score:100|rank:1|...|move:e2e3|score:50|rank:2|..."
      const moves = this.parseAllMoves(text);

      if (moves.length === 0) {
        console.warn('⚠️ ChessDB: 沒有可用走法');
        return null;
      }

      // 根據難度選擇走法
      return this.selectMoveByDifficulty(moves);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('⚠️ ChessDB 請求超時');
      } else {
        console.error('❌ ChessDB 請求失敗:', error);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 解析 queryall 返回的所有走法
   */
  private parseAllMoves(text: string): Array<{ move: string; score: number; rank: number }> {
    const moves: Array<{ move: string; score: number; rank: number }> = [];

    // 分割每個走法資訊 (用 | 分隔)
    const parts = text.split('|');
    let currentMove: any = {};

    for (const part of parts) {
      const trimmed = part.trim();

      if (trimmed.startsWith('move:')) {
        // 如果有之前的走法，先保存
        if (currentMove.move) {
          moves.push(currentMove);
        }
        currentMove = { move: trimmed.substring(5), score: 0, rank: 0 };
      } else if (trimmed.startsWith('score:')) {
        currentMove.score = parseInt(trimmed.substring(6), 10) || 0;
      } else if (trimmed.startsWith('rank:')) {
        currentMove.rank = parseInt(trimmed.substring(5), 10) || 0;
      }
    }

    // 保存最後一個走法
    if (currentMove.move) {
      moves.push(currentMove);
    }

    return moves.filter(m => m.move && m.move.length >= 4);
  }

  /**
   * 根據難度選擇走法
   */
  private selectMoveByDifficulty(
    moves: Array<{ move: string; score: number; rank: number }>
  ): string | null {
    if (moves.length === 0) return null;

    // 按評分排序 (高分優先)
    moves.sort((a, b) => b.score - a.score);

    if (this.difficulty === 'easy') {
      // 簡單模式：選擇後 30%-50% 的走法
      const startIdx = Math.floor(moves.length * 0.3);
      const endIdx = Math.floor(moves.length * 0.5);
      const weakMoves = moves.slice(Math.max(startIdx, 0), Math.max(endIdx, 1));
      const selected = weakMoves[Math.floor(Math.random() * weakMoves.length)];
      console.log(`🎲 簡單模式：從 ${weakMoves.length} 個較弱走法中選擇`);
      return selected?.move || moves[0].move;

    } else if (this.difficulty === 'medium') {
      // 中等模式：選擇前 20%-40% 的走法
      const startIdx = Math.floor(moves.length * 0.2);
      const endIdx = Math.floor(moves.length * 0.4);
      const mediumMoves = moves.slice(0, Math.max(endIdx, 1));
      const selected = mediumMoves[Math.floor(Math.random() * mediumMoves.length)];
      console.log(`🎯 中等模式：從 ${mediumMoves.length} 個中等走法中選擇`);
      return selected?.move || moves[0].move;

    } else {
      // 困難模式（備用）：最佳走法
      return moves[0].move;
    }
  }

  /**
   * 解析 ChessDB 走法格式
   * ChessDB 使用 UCI 格式: "a0a1" (從座標到座標)
   * 需要轉換為我們的 Position 格式
   */
  private parseChessDBMove(uciMove: string, gameState: GameState): AIStrategyResult | null {
    // UCI 格式範例: "b2e2" (b列2行 到 e列2行)
    if (uciMove.length < 4) {
      console.error('❌ 無效的 UCI 走法格式:', uciMove);
      return null;
    }

    // 解析起點和終點
    const fromUci = uciMove.substring(0, 2);
    const toUci = uciMove.substring(2, 4);

    const from = this.uciToPosition(fromUci);
    const to = this.uciToPosition(toUci);

    if (!from || !to) {
      console.error('❌ UCI 走法轉換失敗:', uciMove);
      return null;
    }

    // 驗證走法合法性
    const piece = gameState.board[from.y][from.x];
    if (!piece) {
      console.error('❌ 起點沒有棋子:', from);
      return null;
    }

    // 取得該棋子的所有可能走法
    const possibleMoves = this.chessService.getPossibleMoves(piece, gameState.board);
    const validMoves = possibleMoves.map(pos => ({ from: piece.position, to: pos }));

    const isValid = this.chessService.isValidMove({ from, to }, validMoves);
    if (!isValid) {
      console.error('❌ ChessDB 返回的走法不合法:', { from, to });
      return null;
    }

    return {
      from,
      to,
      analysis: `ChessDB 雲庫推薦 (${uciMove})`,
    };
  }

  /**
   * 將 UCI 座標轉換為 Position
   * UCI 格式: 列(a-i) + 行(0-9)
   * 範例: "b2" -> { x: 1, y: 7 }
   */
  private uciToPosition(uci: string): Position | null {
    if (uci.length !== 2) return null;

    const file = uci.charCodeAt(0) - 'a'.charCodeAt(0); // a=0, b=1, ..., i=8
    const rank = parseInt(uci[1], 10); // 0-9

    // UCI 的 rank 0 是最下方(紅方底線)，我們的 y 軸 0 是最上方(黑方底線)
    const x = file;
    const y = 9 - rank;

    // 驗證座標範圍
    if (x < 0 || x > 8 || y < 0 || y > 9) {
      return null;
    }

    return { x, y };
  }

  /**
   * 將 Position 轉換為 UCI 座標
   * 用於測試和除錯
   */
  private positionToUci(pos: Position): string {
    const file = String.fromCharCode('a'.charCodeAt(0) + pos.x);
    const rank = 9 - pos.y;
    return `${file}${rank}`;
  }
}
