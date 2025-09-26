import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { PlayerColor, Position, GameState } from './chess-piece.interface';
import { ChessGameService } from './chess-game.service';

export interface UCIEngine {
  name: string;
  author: string;
  isReady: boolean;
  difficulty: number; // 1-10
}

export interface UCIEngineMove {
  from: Position;
  to: Position;
  score?: number;
  depth?: number;
  pv?: string; // Principal Variation
}

@Injectable({
  providedIn: 'root',
})
export class UCIEngineService {
  private chessGameService = inject(ChessGameService);
  private engines: Map<string, UCIEngine> = new Map();
  private currentEngine: string | null = null;
  private engineReady$ = new BehaviorSubject<boolean>(false);
  private isThinking$ = new BehaviorSubject<boolean>(false);

  // 可用的象棋引擎配置
  private availableEngines = [
    {
      name: 'Pikafish',
      path: 'engines/pikafish.exe', // Windows
      author: 'Pikafish Team',
      difficulty: 9,
      description: 'Professional xiangqi engine with NNUE evaluation'
    },
    {
      name: 'Fairy-Stockfish',
      path: 'engines/fairy-stockfish.exe', // Windows
      author: 'Fairy-Stockfish Team',
      difficulty: 8,
      description: 'Multi-variant chess engine supporting xiangqi'
    }
  ];

  constructor() {
    console.log('🔧 UCI引擎服務已初始化');
  }

  // 獲取可用引擎列表
  getAvailableEngines() {
    return this.availableEngines;
  }

  // 初始化引擎 (模擬實現 - 實際需要後端支援)
  async initializeEngine(engineName: string): Promise<boolean> {
    console.log(`🚀 初始化引擎: ${engineName}`);

    try {
      // 模擬引擎初始化過程
      await this.delay(1000);

      const engineConfig = this.availableEngines.find(e => e.name === engineName);
      if (!engineConfig) {
        console.error(`❌ 找不到引擎: ${engineName}`);
        return false;
      }

      const engine: UCIEngine = {
        name: engineConfig.name,
        author: engineConfig.author,
        isReady: true,
        difficulty: engineConfig.difficulty
      };

      this.engines.set(engineName, engine);
      this.currentEngine = engineName;
      this.engineReady$.next(true);

      console.log(`✅ 引擎 ${engineName} 初始化完成`);
      return true;
    } catch (error) {
      console.error(`❌ 引擎初始化失敗:`, error);
      this.engineReady$.next(false);
      return false;
    }
  }

  // 關閉引擎
  async shutdownEngine(): Promise<void> {
    if (this.currentEngine) {
      console.log(`🔌 關閉引擎: ${this.currentEngine}`);
      this.engines.delete(this.currentEngine);
      this.currentEngine = null;
      this.engineReady$.next(false);
      this.isThinking$.next(false);
    }
  }

  // 獲取引擎移動 (模擬實現)
  async getEngineMove(gameState: GameState, timeLimit: number = 3000): Promise<UCIEngineMove | null> {
    if (!this.currentEngine || !this.engineReady$.value) {
      console.error('❌ 引擎未就緒');
      return null;
    }

    console.log(`🧠 ${this.currentEngine} 開始分析...`);
    this.isThinking$.next(true);

    try {
      // 模擬引擎分析過程
      await this.delay(Math.min(timeLimit, 2000));

      // 模擬引擎返回的移動和分析結果
      const mockMove = this.generateMockEngineMove(gameState);

      this.isThinking$.next(false);

      if (mockMove) {
        console.log(`🎯 ${this.currentEngine} 推薦移動:`, mockMove);
        console.log(`📊 評分: ${mockMove.score}, 深度: ${mockMove.depth}`);
      }

      return mockMove;
    } catch (error) {
      console.error('❌ 引擎分析失敗:', error);
      this.isThinking$.next(false);
      return null;
    }
  }

  // 模擬引擎移動生成 (實際實現需要與真實引擎通訊)
  private generateMockEngineMove(gameState: GameState): UCIEngineMove | null {
    // 獲取所有可能移動
    const possibleMoves = this.getAllPossibleMoves(gameState, PlayerColor.BLACK);

    if (possibleMoves.length === 0) {
      console.warn('🔍 UCI引擎：沒有找到任何有效移動');
      return null;
    }

    console.log(`🎯 UCI引擎：在 ${possibleMoves.length} 個有效移動中選擇`);

    // 簡單的移動評估和排序
    const evaluatedMoves = possibleMoves.map(move => {
      let score = 0;

      // 吃子移動優先
      const targetPiece = gameState.board[move.to.y][move.to.x];
      if (targetPiece && targetPiece.color === PlayerColor.RED) {
        score += 100;
        console.log(`⚡ 發現吃子移動: ${this.positionToNotation(move.from)} -> ${this.positionToNotation(move.to)}`);
      }

      // 檢查移動後是否將軍
      const testBoard = this.simulateMove(gameState.board, move.from, move.to);
      if (this.chessGameService.isInCheck(testBoard, PlayerColor.RED)) {
        score += 50;
        console.log(`👑 發現將軍移動: ${this.positionToNotation(move.from)} -> ${this.positionToNotation(move.to)}`);
      }

      // 添加一些隨機性
      score += Math.floor(Math.random() * 20);

      return { move, score };
    });

    // 排序並選擇最佳移動
    evaluatedMoves.sort((a, b) => b.score - a.score);
    const selectedMove = evaluatedMoves[0].move;

    console.log(`✅ UCI引擎選擇: ${this.positionToNotation(selectedMove.from)} -> ${this.positionToNotation(selectedMove.to)} (評分: ${evaluatedMoves[0].score})`);

    return {
      from: selectedMove.from,
      to: selectedMove.to,
      score: evaluatedMoves[0].score,
      depth: 12,
      pv: `${this.positionToNotation(selectedMove.from)}${this.positionToNotation(selectedMove.to)}`
    };
  }

  // 獲取所有可能移動 (使用完整象棋規則)
  private getAllPossibleMoves(gameState: GameState, color: PlayerColor): { from: Position; to: Position }[] {
    const moves: { from: Position; to: Position }[] = [];
    const board = gameState.board;

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = board[y][x];
        if (piece && piece.color === color) {
          // 使用 ChessGameService 的完整規則獲取可能移動
          try {
            const possibleMoves = this.chessGameService.getPossibleMoves(piece, board);
            for (const moveTo of possibleMoves) {
              // 驗證移動不會讓自己被將軍
              const testBoard = this.simulateMove(board, piece.position, moveTo);
              if (!this.chessGameService.isInCheck(testBoard, color)) {
                moves.push({ from: piece.position, to: moveTo });
              }
            }
          } catch (error) {
            console.warn(`獲取棋子 ${piece.type} 移動失敗:`, error);
          }
        }
      }
    }

    console.log(`🔍 UCI引擎找到 ${moves.length} 個有效移動`);
    return moves;
  }

  // 模擬移動 (簡化版本，僅用於驗證)
  private simulateMove(board: any[][], from: Position, to: Position): any[][] {
    const newBoard = board.map(row => [...row]);
    const piece = newBoard[from.y][from.x];
    newBoard[from.y][from.x] = null;
    newBoard[to.y][to.x] = piece ? { ...piece, position: to } : null;
    return newBoard;
  }

  // 位置轉換為記譜法
  private positionToNotation(pos: Position): string {
    const files = 'abcdefghi';
    return files[pos.x] + (9 - pos.y);
  }

  // 設置引擎選項
  async setEngineOption(option: string, value: string): Promise<void> {
    if (!this.currentEngine) {
      console.error('❌ 沒有活動引擎');
      return;
    }

    console.log(`⚙️ 設置引擎選項: ${option} = ${value}`);
    // 實際實現需要發送 UCI setoption 命令
  }

  // 設置引擎難度
  async setDifficulty(level: number): Promise<void> {
    if (level < 1 || level > 10) {
      console.error('❌ 難度等級必須在1-10之間');
      return;
    }

    // 根據難度調整引擎參數
    const timeLimit = Math.floor(level * 500); // 500ms * level
    const depth = Math.floor(level * 1.5); // depth based on level

    await this.setEngineOption('Depth', depth.toString());
    await this.setEngineOption('MoveTime', timeLimit.toString());

    console.log(`🎚️ 設置引擎難度為 ${level}/10`);
  }

  // 工具方法
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Observable getters
  get engineReady(): Observable<boolean> {
    return this.engineReady$.asObservable();
  }

  get isThinking(): Observable<boolean> {
    return this.isThinking$.asObservable();
  }

  get currentEngineName(): string | null {
    return this.currentEngine;
  }

  // 獲取引擎資訊
  getEngineInfo(): UCIEngine | null {
    if (!this.currentEngine) return null;
    return this.engines.get(this.currentEngine) || null;
  }

  // 引擎健康檢查
  async pingEngine(): Promise<boolean> {
    if (!this.currentEngine || !this.engineReady$.value) {
      return false;
    }

    try {
      // 模擬ping檢查
      await this.delay(100);
      return true;
    } catch {
      return false;
    }
  }
}