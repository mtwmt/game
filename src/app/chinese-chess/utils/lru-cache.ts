import { GAME_CONSTANTS } from './chinese-chess-config';

/**
 * 簡單的 LRU (Least Recently Used) 快取實現
 * 用於快取棋子移動計算結果，提升性能
 */
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private readonly maxSize: number;

  /**
   * 建構 LRU 快取
   * @param maxSize 快取最大容量，預設使用遊戲常數設定
   */
  constructor(maxSize: number = GAME_CONSTANTS.CACHE_SIZE) {
    this.maxSize = maxSize;
  }

  /**
   * 取得快取值
   * 會將存取的項目移到最近使用位置
   * @param key 快取鍵值
   * @returns 快取值或 undefined
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // 重新插入以更新順序（移到最近使用位置）
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  /**
   * 設定快取值
   * 當快取滿時會移除最久未使用的項目
   * @param key 快取鍵值
   * @param value 快取值
   */
  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      // 如果已存在，先刪除舊的
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 如果快取滿了，刪除最久未使用的項目（Map 的第一個項目）
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  /**
   * 檢查快取中是否存在指定鍵值
   * @param key 快取鍵值
   * @returns 是否存在
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * 清空快取
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 取得快取大小
   * @returns 當前快取項目數量
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 取得快取最大容量
   * @returns 最大容量
   */
  get maxCapacity(): number {
    return this.maxSize;
  }
}
