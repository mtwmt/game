import type { LevelType } from '../pet-match.interface';
import { calculateOptimalBoard } from '../../shared/utils/board-calculator';

// PC版遊戲配置
export const GAME_CONFIG = {
  width: 14,
  height: 10,
  petTypes: 12,
  maxLevelTime: 300, // 每關限時5分鐘
} as const;

// 手機版遊戲配置（固定，作為後備）
export const MOBILE_GAME_CONFIG = {
  width: 7,
  height: 10,
  petTypes: 12,
  maxLevelTime: 300,
} as const;

// 遊戲常數
export const GAME_CONSTANTS = {
  // 分數相關
  MATCH_SCORE: 10, // 每次配對得分

  // 道具相關
  MAX_SHUFFLES_PER_GAME: 5, // 整個遊戲共5次重排
  MAX_HINTS_PER_GAME: 5, // 整個遊戲共5次提示
  HINT_DISPLAY_TIME: 3000, // 提示顯示時間（毫秒）

  // 動畫相關
  PATH_ANIMATION_TIME: 200, // 路徑動畫時間（毫秒）
  SELECTION_CLEAR_TIME: 300, // 選擇清除延遲（毫秒）

  // 關卡相關
  MAX_LEVELS: 5, // 總共5關

  // 連線相關
  MAX_TURNS: 2, // 最多2個轉彎

  // 計時器更新間隔
  TIMER_INTERVAL: 1000, // 1秒
} as const;

// 寵物表情符號
export const PET_EMOJIS = [
  '🐶', // Dog
  '🐱', // Cat
  '🐭', // Mouse
  '🐹', // Hamster
  '🐰', // Rabbit
  '🦊', // Fox
  '🐻', // Bear
  '🐼', // Panda
  '🐷', // Pig
  '🐸', // Frog
  '🐵', // Monkey
  '🦋', // Butterfly
  '🐔', // Chicken
  '🦆', // Duck
  '🦅', // Eagle
  '🦉', // Owl
  '🐺', // Wolf
  '🐗', // Boar
] as const;

// 寵物顏色配置
export const PET_COLORS = [
  'from-blue-400 to-blue-600 border-blue-300', // 🐶 Dog
  'from-pink-400 to-pink-600 border-pink-300', // 🐱 Cat
  'from-gray-400 to-gray-600 border-gray-300', // 🐭 Mouse
  'from-yellow-400 to-yellow-600 border-yellow-300', // 🐹 Hamster
  'from-purple-400 to-purple-600 border-purple-300', // 🐰 Rabbit
  'from-orange-400 to-orange-600 border-orange-300', // 🦊 Fox
  'from-amber-600 to-amber-800 border-amber-400', // 🐻 Bear
  'from-slate-400 to-slate-600 border-slate-300', // 🐼 Panda
  'from-rose-400 to-rose-600 border-rose-300', // 🐷 Pig
  'from-green-400 to-green-600 border-green-300', // 🐸 Frog
  'from-teal-400 to-teal-600 border-teal-300', // 🐵 Monkey
  'from-violet-400 to-violet-600 border-violet-300', // 🦋 Butterfly
  'from-red-400 to-red-600 border-red-300', // 🐔 Chicken
  'from-cyan-400 to-cyan-600 border-cyan-300', // 🦆 Duck
  'from-indigo-400 to-indigo-600 border-indigo-300', // 🦅 Eagle
  'from-fuchsia-400 to-fuchsia-600 border-fuchsia-300', // 🦉 Owl
  'from-zinc-400 to-zinc-600 border-zinc-300', // 🐺 Wolf
  'from-stone-400 to-stone-600 border-stone-300', // 🐗 Boar
] as const;

/**
 * 動態計算最適合手機版的棋盤配置
 * 連連看特殊需求：總格子數必須為雙數（配對遊戲）
 */
export function calculateOptimalMobileBoard(
  screenWidth: number,
  screenHeight: number
): { width: number; height: number; petTypes: number } {
  // 使用共用的棋盤計算器
  const config = {
    cellSize: 48, // 連連看方塊較大 (48px vs 32px)
    paddingHorizontal: 40,
    paddingVertical: 280, // 連連看上方統計區域較大
    gapTotal: 2,
    borderTotal: 4,
    minBoardSize: 6,
    maxBoardWidth: 10, // 手機版限制較小的寬度
    maxBoardHeight: 15,
    elementDensity: undefined, // 不使用密度計算
  };

  const board = calculateOptimalBoard(screenWidth, screenHeight, config);

  // 計算總格子數
  let totalCells = board.width * board.height;

  // 確保總格子數為雙數
  if (totalCells % 2 !== 0) {
    // 如果是奇數，優先減少高度
    if (board.height > config.minBoardSize) {
      board.height--;
      totalCells = board.width * board.height;
    } else if (board.width > config.minBoardSize) {
      // 如果高度已經最小，則減少寬度
      board.width--;
      totalCells = board.width * board.height;
    }
  }

  // 計算寵物類型數量（至少為總格子數的一半，最多12種）
  const petTypes = Math.min(12, Math.max(6, Math.floor(totalCells / 2)));

  return {
    width: board.width,
    height: board.height,
    petTypes,
  };
}

/**
 * 獲取遊戲配置（根據裝置類型）
 */
export function getGameConfig(
  isMobile: boolean,
  screenWidth?: number,
  screenHeight?: number
): { width: number; height: number; petTypes: number; maxLevelTime: number } {
  if (isMobile && screenWidth && screenHeight) {
    const mobileBoard = calculateOptimalMobileBoard(screenWidth, screenHeight);
    return {
      ...mobileBoard,
      maxLevelTime: GAME_CONFIG.maxLevelTime,
    };
  }

  // PC版使用預設配置
  return { ...GAME_CONFIG };
}

/**
 * 根據關卡等級獲取關卡類型
 */
export function getLevelType(level: number): LevelType {
  if (level === 1) return 'classic';
  if (level === 2) return 'down';
  if (level === 3) return 'up';
  if (level === 4) return 'left';
  return 'right'; // 第五關以後
}
