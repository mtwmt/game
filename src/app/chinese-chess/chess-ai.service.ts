import { inject, Injectable } from '@angular/core';
import { PlayerColor, Position, GameState } from './chess-piece.interface';
import { ChessGameService } from './chess-game.service';
import { UCIEngineService, UCIEngineMove } from './uci-engine.service';
import { PIECE_VALUES, getPositionBonus } from './chess-values';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface MoveEval {
  move: { from: Position; to: Position };
  score: number;
}

@Injectable({
  providedIn: 'root',
})
export class ChessAIService {
  private chessGameService = inject(ChessGameService);
  private uciEngineService = inject(UCIEngineService);
  private maxDepth = 4;
  private searchTime = 3000;
  private startTime = 0;
  private nodes = 0;
  private useGeminiAI = false; // Gemini AI 作為備用
  private useUCIEngine = true; // 優先使用 UCI 引擎
  private useLegacyMinimax = false; // 傳統算法作為最後備案

  async makeAIMove(gameState: GameState): Promise<{ from: Position; to: Position } | null> {
    console.log(`🧠 AI開始思考...`);
    this.startTime = Date.now();
    this.nodes = 0;

    try {
      // 1. 優先使用 UCI 引擎 (Pikafish 等專業引擎)
      if (this.useUCIEngine) {
        console.log('⚡ 使用 UCI 引擎進行分析...');
        const uciMove = await this.getUCIEngineMove(gameState);
        if (uciMove) {
          const elapsed = Date.now() - this.startTime;
          console.log(`🎯 UCI 引擎決策完成: ${elapsed}ms`);
          console.log(`🏆 UCI 引擎選擇移動: (${uciMove.from.x},${uciMove.from.y}) -> (${uciMove.to.x},${uciMove.to.y})`);
          if (uciMove.score !== undefined) {
            console.log(`📊 引擎評分: ${uciMove.score}, 搜索深度: ${uciMove.depth || 'N/A'}`);
          }
          return uciMove;
        }
        console.log('⚠️ UCI 引擎未能提供有效移動，嘗試備用方案...');
      }

      // 2. 備用: Gemini AI
      if (this.useGeminiAI) {
        console.log('🤖 使用 Gemini AI 進行決策...');
        const geminiMove = await this.getGeminiMove(gameState);
        if (geminiMove) {
          const elapsed = Date.now() - this.startTime;
          console.log(`🎯 Gemini AI 決策完成: ${elapsed}ms`);
          console.log(
            `🤖 Gemini 選擇移動: (${geminiMove.from.x},${geminiMove.from.y}) -> (${geminiMove.to.x},${geminiMove.to.y})`
          );
          return geminiMove;
        }
        console.log('⚠️ Gemini AI 未能提供有效移動，嘗試傳統算法...');
      }

      // 3. 最後備案: 傳統 Minimax 算法
      if (this.useLegacyMinimax) {
        console.log(`🧠 使用 Minimax 算法 (深度${this.maxDepth}層)...`);
        const result = this.minimax(gameState, this.maxDepth, -Infinity, Infinity, true);

        const elapsed = Date.now() - this.startTime;
        console.log(`🎯 Minimax 決策完成: ${elapsed}ms, 搜索${this.nodes}個節點`);

        if (result && result.move) {
          console.log(
            `🤖 選擇移動: (${result.move.from.x},${result.move.from.y}) -> (${result.move.to.x},${result.move.to.y}), 評分: ${result.score}`
          );
          return result.move;
        }
      }

      // 4. 緊急備案: 隨機選擇
      console.log('🎲 使用隨機移動作為最後備案...');
      const moves = this.getAllPossibleMoves(gameState, PlayerColor.BLACK);
      return moves.length > 0 ? moves[Math.floor(Math.random() * moves.length)] : null;
    } catch (error) {
      console.error('🤖 AI思考出錯:', error);
      const moves = this.getAllPossibleMoves(gameState, PlayerColor.BLACK);
      return moves.length > 0 ? moves[0] : null;
    }
  }

  // 使用 UCI 引擎獲取最佳移動
  private async getUCIEngineMove(gameState: GameState): Promise<UCIEngineMove | null> {
    try {
      // 檢查引擎是否已初始化
      const engineInfo = this.uciEngineService.getEngineInfo();
      if (!engineInfo || !engineInfo.isReady) {
        console.log('🔧 初始化 Pikafish 引擎...');
        const success = await this.uciEngineService.initializeEngine('Pikafish');
        if (!success) {
          console.log('❌ UCI 引擎初始化失敗');
          return null;
        }
      }

      // 獲取引擎移動，使用動態時間限制
      const timeLimit = this.searchTime;
      console.log(`⏱️ 引擎分析時間限制: ${timeLimit}ms`);

      const engineMove = await this.uciEngineService.getEngineMove(gameState, timeLimit);

      if (engineMove) {
        // 驗證引擎移動是否有效
        const possibleMoves = this.getAllPossibleMoves(gameState, PlayerColor.BLACK);
        const isValid = this.isValidMove(engineMove, possibleMoves);

        if (isValid) {
          console.log(`✅ UCI 引擎移動有效`);
          return engineMove;
        } else {
          console.log(`❌ UCI 引擎返回無效移動`);
        }
      }

      return null;
    } catch (error) {
      console.error('❌ UCI 引擎調用失敗:', error);
      return null;
    }
  }

  // 使用 Gemini AI 獲取最佳移動
  private async getGeminiMove(
    gameState: GameState
  ): Promise<{ from: Position; to: Position } | null> {
    try {
      // Gemini AI 可直接使用 (已移除登入要求)

      // 檢查 API Key 是否已設置 (優先使用用戶輸入的 Key)
      const userApiKey =
        typeof localStorage !== 'undefined' ? localStorage.getItem('gemini-api-key') : null;
      const apiKey = userApiKey;

      if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
        console.log('❌ Gemini API Key 未設置，請在設定中輸入 API Key');
        return null;
      }

      // 使用 Google Generative AI SDK (API Key 方式)
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
        const geminiResponse = JSON.parse(jsonMatch[0]);
        console.log('🤖 Gemini 分析:', geminiResponse.analysis);
        console.log('🤖 選擇理由:', geminiResponse.reasoning);

        // 驗證移動是否有效
        const possibleMoves = this.getAllPossibleMoves(gameState, PlayerColor.BLACK);
        const move = geminiResponse.move;
        if (this.isValidMove(move, possibleMoves)) {
          return move;
        } else {
          console.log('❌ Gemini 提供的移動無效');
        }
      }
    } catch (error) {
      console.error('❌ Gemini API 調用失敗:', error);
    }

    return null;
  }

  // 創建 Gemini 提示
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

  // 描述棋盤狀態
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

  // 描述可用移動
  private describeValidMoves(moves: { from: Position; to: Position }[]): string {
    return moves
      .map(
        (move, index) =>
          `${index + 1}. Move from (${move.from.x},${move.from.y}) to (${move.to.x},${move.to.y})`
      )
      .join('\n');
  }

  // 驗證移動是否有效
  private isValidMove(
    move: { from: Position; to: Position },
    possibleMoves: { from: Position; to: Position }[]
  ): boolean {
    return possibleMoves.some(
      (validMove) =>
        validMove.from.x === move.from.x &&
        validMove.from.y === move.from.y &&
        validMove.to.x === move.to.x &&
        validMove.to.y === move.to.y
    );
  }

  // AI 模式控制方法
  setUseUCIEngine(use: boolean): void {
    this.useUCIEngine = use;
    console.log(`🔧 UCI 引擎模式: ${use ? '啟用' : '停用'}`);
  }

  setUseGeminiAI(use: boolean): void {
    this.useGeminiAI = use;
    console.log(`🤖 Gemini AI 模式: ${use ? '啟用' : '停用'}`);
  }

  setUseLegacyMinimax(use: boolean): void {
    this.useLegacyMinimax = use;
    console.log(`🧠 傳統 Minimax 模式: ${use ? '啟用' : '停用'}`);
  }

  // 設置 AI 優先級模式
  setAIMode(mode: 'uci-only' | 'gemini-only' | 'minimax-only' | 'mixed' | 'auto'): void {
    switch (mode) {
      case 'uci-only':
        this.useUCIEngine = true;
        this.useGeminiAI = false;
        this.useLegacyMinimax = false;
        console.log('🏆 AI 模式: 僅使用 UCI 引擎');
        break;
      case 'gemini-only':
        this.useUCIEngine = false;
        this.useGeminiAI = true;
        this.useLegacyMinimax = false;
        console.log('🤖 AI 模式: 僅使用 Gemini AI');
        break;
      case 'minimax-only':
        this.useUCIEngine = false;
        this.useGeminiAI = false;
        this.useLegacyMinimax = true;
        console.log('🧠 AI 模式: 僅使用 Minimax 算法');
        break;
      case 'mixed':
        this.useUCIEngine = true;
        this.useGeminiAI = true;
        this.useLegacyMinimax = true;
        console.log('🔀 AI 模式: 混合模式 (UCI → Gemini → Minimax)');
        break;
      case 'auto':
      default:
        this.useUCIEngine = true;
        this.useGeminiAI = false;
        this.useLegacyMinimax = false;
        console.log('⚡ AI 模式: 自動 (優先 UCI 引擎)');
        break;
    }
  }

  // 初始化並設置引擎
  async initializeAI(engineName: string = 'Pikafish'): Promise<boolean> {
    console.log(`🚀 初始化 AI 系統，使用引擎: ${engineName}`);
    try {
      const success = await this.uciEngineService.initializeEngine(engineName);
      if (success) {
        console.log(`✅ AI 系統初始化完成`);
        this.setAIMode('auto'); // 設置為自動模式
      }
      return success;
    } catch (error) {
      console.error('❌ AI 系統初始化失敗:', error);
      return false;
    }
  }

  // 獲取當前 AI 狀態
  getAIStatus(): {
    uciEngine: boolean;
    geminiAI: boolean;
    legacyMinimax: boolean;
    currentEngine: string | null;
    engineReady: boolean;
  } {
    return {
      uciEngine: this.useUCIEngine,
      geminiAI: this.useGeminiAI,
      legacyMinimax: this.useLegacyMinimax,
      currentEngine: this.uciEngineService.currentEngineName,
      engineReady: this.uciEngineService.getEngineInfo()?.isReady || false
    };
  }

  // Minimax with Alpha-Beta Pruning
  private minimax(
    gameState: GameState,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean
  ): MoveEval | null {
    this.nodes++;

    // 時間限制檢查
    if (Date.now() - this.startTime > this.searchTime) {
      return null;
    }

    // 終止條件: 深度為0或遊戲結束
    if (depth === 0) {
      return {
        move: { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } },
        score: this.evaluatePosition(gameState),
      };
    }

    const currentColor = isMaximizing ? PlayerColor.BLACK : PlayerColor.RED;
    const moves = this.getAllPossibleMoves(gameState, currentColor);

    if (moves.length === 0) {
      // 無移動可走，檢查是否將死
      const inCheck = this.chessGameService.isInCheck(gameState.board, currentColor);
      if (inCheck) {
        // 將死
        return {
          move: { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } },
          score: isMaximizing ? -10000 : 10000,
        };
      } else {
        // 和棋
        return { move: { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } }, score: 0 };
      }
    }

    // 移動排序優化 - 優先考慮吃子和將軍
    const sortedMoves = this.orderMoves(gameState, moves);

    let bestMove: { from: Position; to: Position } | null = null;

    if (isMaximizing) {
      let maxEval = -Infinity;

      for (const move of sortedMoves) {
        const newState = this.simulateMove(gameState, move.from, move.to);

        // 檢查移動是否會讓自己被將軍（剪枝）
        if (this.chessGameService.isInCheck(newState.board, PlayerColor.BLACK)) {
          continue; // 跳過這個危險移動
        }

        const result = this.minimax(newState, depth - 1, alpha, beta, false);

        if (result && result.score > maxEval) {
          maxEval = result.score;
          bestMove = move;
        }

        alpha = Math.max(alpha, maxEval);
        if (beta <= alpha) {
          break; // Alpha-Beta剪枝
        }
      }

      return bestMove ? { move: bestMove, score: maxEval } : null;
    } else {
      let minEval = Infinity;

      for (const move of sortedMoves) {
        const newState = this.simulateMove(gameState, move.from, move.to);

        // 檢查移動是否會讓自己被將軍
        if (this.chessGameService.isInCheck(newState.board, PlayerColor.RED)) {
          continue;
        }

        const result = this.minimax(newState, depth - 1, alpha, beta, true);

        if (result && result.score < minEval) {
          minEval = result.score;
          bestMove = move;
        }

        beta = Math.min(beta, minEval);
        if (beta <= alpha) {
          break; // Alpha-Beta剪枝
        }
      }

      return bestMove ? { move: bestMove, score: minEval } : null;
    }
  }

  // 移動排序 - 優先搜索可能更好的移動
  private orderMoves(
    gameState: GameState,
    moves: { from: Position; to: Position }[]
  ): { from: Position; to: Position }[] {
    return moves.sort((a, b) => {
      let scoreA = 0,
        scoreB = 0;

      // 吃子移動優先
      const targetA = gameState.board[a.to.y][a.to.x];
      const targetB = gameState.board[b.to.y][b.to.x];

      if (targetA) scoreA += PIECE_VALUES[targetA.type];
      if (targetB) scoreB += PIECE_VALUES[targetB.type];

      // 將軍移動優先
      const testStateA = this.simulateMove(gameState, a.from, a.to);
      const testStateB = this.simulateMove(gameState, b.from, b.to);

      if (this.chessGameService.isInCheck(testStateA.board, PlayerColor.RED)) scoreA += 100;
      if (this.chessGameService.isInCheck(testStateB.board, PlayerColor.RED)) scoreB += 100;

      return scoreB - scoreA;
    });
  }

  // 位置評估函數
  private evaluatePosition(gameState: GameState): number {
    let score = 0;

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = gameState.board[y][x];
        if (!piece) continue;

        let pieceValue = PIECE_VALUES[piece.type];

        // 位置獎勵
        // 使用chess-values.ts中的完整位置表
        pieceValue += getPositionBonus(piece.type, x, y, piece.color);

        if (piece.color === PlayerColor.BLACK) {
          score += pieceValue;
        } else {
          score -= pieceValue;
        }
      }
    }

    // 機動性評估
    const blackMoves = this.getAllPossibleMoves(gameState, PlayerColor.BLACK).length;
    const redMoves = this.getAllPossibleMoves(gameState, PlayerColor.RED).length;
    score += (blackMoves - redMoves) * 5;

    // 將軍懲罰/獎勵
    if (this.chessGameService.isInCheck(gameState.board, PlayerColor.BLACK)) {
      score -= 100;
    }
    if (this.chessGameService.isInCheck(gameState.board, PlayerColor.RED)) {
      score += 100;
    }

    return score;
  }

  // 模擬移動（優化版本，減少不必要的複製）
  private simulateMove(gameState: GameState, from: Position, to: Position): GameState {
    // 只複製受影響的行和棋子
    const newBoard = gameState.board.map((row, y) => {
      if (y === from.y || y === to.y) {
        return row.map((piece, x) => {
          if ((x === from.x && y === from.y) || (x === to.x && y === to.y)) {
            if (x === from.x && y === from.y) {
              // 移動的起始位置變為空
              return null;
            } else if (x === to.x && y === to.y) {
              // 目標位置放置移動的棋子
              const movingPiece = gameState.board[from.y][from.x];
              return movingPiece
                ? {
                    ...movingPiece,
                    position: { x: to.x, y: to.y },
                    hasMoved: true,
                    isSelected: false,
                  }
                : null;
            }
          }
          return piece;
        });
      }
      return row; // 未受影響的行直接引用原陣列
    });

    return { ...gameState, board: newBoard };
  }

  // 獲取所有可能移動
  private getAllPossibleMoves(
    gameState: GameState,
    color: PlayerColor
  ): { from: Position; to: Position }[] {
    const moves: { from: Position; to: Position }[] = [];
    const board = gameState.board;

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = board[y][x];
        if (piece && piece.color === color) {
          const possibleMoves = this.chessGameService.getPossibleMoves(piece, board);
          for (const moveTo of possibleMoves) {
            moves.push({ from: piece.position, to: moveTo });
          }
        }
      }
    }

    return moves;
  }

  // 設置難度
  setDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
    switch (difficulty) {
      case 'easy':
        this.maxDepth = 2;
        this.searchTime = 1000;
        break;
      case 'medium':
        this.maxDepth = 4;
        this.searchTime = 3000;
        break;
      case 'hard':
        this.maxDepth = 6;
        this.searchTime = 5000;
        break;
    }
  }

  getThinkingDescription(): string {
    if (this.useUCIEngine) {
      const engineName = this.uciEngineService.currentEngineName || 'UCI引擎';
      return `⚡ ${engineName} 正在進行深度分析...`;
    } else if (this.useGeminiAI) {
      return '🤖 Gemini AI 正在分析棋局...';
    } else if (this.useLegacyMinimax) {
      return '🧠 AI正在使用Minimax算法深度分析...';
    } else {
      return '🎲 AI正在選擇移動...';
    }
  }

  // 獲取詳細的思考狀態
  getDetailedThinkingStatus(): {
    description: string;
    mode: string;
    engine?: string;
    isThinking: boolean;
  } {
    const aiStatus = this.getAIStatus();
    let mode = 'unknown';
    let description = '';

    if (aiStatus.uciEngine) {
      mode = 'uci';
      description = `${aiStatus.currentEngine || 'UCI引擎'} 分析中...`;
    } else if (aiStatus.geminiAI) {
      mode = 'gemini';
      description = 'Gemini AI 思考中...';
    } else if (aiStatus.legacyMinimax) {
      mode = 'minimax';
      description = 'Minimax 算法計算中...';
    } else {
      mode = 'random';
      description = '隨機選擇中...';
    }

    return {
      description,
      mode,
      engine: aiStatus.currentEngine || undefined,
      isThinking: true // 可以從 uciEngineService 獲取實際狀態
    };
  }
}
