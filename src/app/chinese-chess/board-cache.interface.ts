import { ChessPiece, PlayerColor, Position } from './chess-piece.interface';

/**
 * 棋盤快取介面
 * 用於快取棋盤狀態資訊以提升性能
 */
export interface BoardCache {
  /** 各顏色王的位置快取 */
  kingPositions: Map<PlayerColor, Position>;

  /** 各顏色棋子列表快取 */
  piecesByColor: Map<PlayerColor, ChessPiece[]>;

  /** 最後更新的移動計數 */
  lastMoveCount: number;
}

/**
 * 棋盤快取工具類
 * 提供棋盤快取相關的輔助方法
 */
export class BoardCacheUtils {
  /**
   * 創建空的棋盤快取
   * @returns 初始化的棋盤快取
   */
  static createEmptyCache(): BoardCache {
    return {
      kingPositions: new Map(),
      piecesByColor: new Map([
        [PlayerColor.RED, []],
        [PlayerColor.BLACK, []]
      ]),
      lastMoveCount: -1,
    };
  }

  /**
   * 重置棋盤快取
   * @param cache 要重置的快取
   */
  static resetCache(cache: BoardCache): void {
    cache.kingPositions.clear();
    cache.piecesByColor.clear();
    cache.piecesByColor.set(PlayerColor.RED, []);
    cache.piecesByColor.set(PlayerColor.BLACK, []);
    cache.lastMoveCount = -1;
  }

  /**
   * 檢查快取是否需要更新
   * @param cache 棋盤快取
   * @param moveCount 當前移動計數
   * @returns 是否需要更新
   */
  static needsUpdate(cache: BoardCache, moveCount: number): boolean {
    return cache.lastMoveCount !== moveCount;
  }
}