import { Position } from './chess-piece.interface';

// 定義棋譜類型
export interface ChessGameRecord {
  id: string;
  name: string;
  result: 'red_win' | 'black_win' | 'draw';
  moves: string[]; // 以中文表示的棋譜，如 "炮二平五", "馬八進七" 等
  positions?: Array<{
    board: string; // 簡化的棋盤表示，用於快速查找
    evaluation: number; // 該位置的評分
  }>;
}

// 開局庫 - 包含經典開局及其變化
export const OPENING_LIBRARY: {
  [key: string]: Array<{ moves: string[]; popularity: number; winRate: number }>;
} = {
  // 中炮開局系列
  中炮: [
    {
      moves: ['炮二平五', '馬八進七', '馬二進三', '車九平八', '車一平二'],
      popularity: 95,
      winRate: 0.52,
    },
    {
      moves: ['炮二平五', '馬八進七', '馬二進三', '卒七進一', '車一進一'],
      popularity: 85,
      winRate: 0.55,
    },
    {
      moves: ['炮二平五', '馬八進七', '車一平二', '車九平八', '馬二進三'],
      popularity: 80,
      winRate: 0.53,
    },
  ],

  // 仙人指路開局
  仙人指路: [
    {
      moves: ['炮八平五', '馬八進七', '馬八進七', '車九平八'],
      popularity: 70,
      winRate: 0.48,
    },
  ],

  // 飛相開局
  飛相: [
    {
      moves: ['相三進五', '馬八進七', '馬二進三', '車九平八'],
      popularity: 65,
      winRate: 0.49,
    },
  ],

  // 屏風馬開局
  屏風馬: [
    {
      moves: ['馬二進三', '卒七進一', '馬八進七', '馬二進三', '車一平二'],
      popularity: 80,
      winRate: 0.51,
    },
  ],

  // 順手炮開局
  順手炮: [
    {
      moves: ['馬二進三', '馬八進七', '炮二平六', '車九平八', '兵三進一'],
      popularity: 75,
      winRate: 0.5,
    },
  ],
};

// 典型開局的標準應對策略 (從棋譜中學習的最佳回應)
export const STANDARD_RESPONSES: {
  [key: string]: Array<{ from: Position; to: Position; description: string }>;
} = {
  // 紅方中炮開局的黑方應對
  炮二平五: [
    { from: { x: 1, y: 0 }, to: { x: 2, y: 2 }, description: '馬八進七' },
    { from: { x: 7, y: 0 }, to: { x: 6, y: 2 }, description: '馬二進三' },
    { from: { x: 0, y: 3 }, to: { x: 0, y: 4 }, description: '卒一進一' },
    { from: { x: 2, y: 3 }, to: { x: 2, y: 4 }, description: '卒三進一' },
    { from: { x: 1, y: 7 }, to: { x: 1, y: 4 }, description: '炮八進三' },
  ],

  // 紅方仙人指路開局的黑方應對
  炮八平五: [
    { from: { x: 1, y: 0 }, to: { x: 2, y: 2 }, description: '馬八進七' },
    { from: { x: 7, y: 0 }, to: { x: 6, y: 2 }, description: '馬二進三' },
    { from: { x: 4, y: 3 }, to: { x: 4, y: 4 }, description: '卒五進一' },
    { from: { x: 1, y: 7 }, to: { x: 1, y: 6 }, description: '炮八進一' },
  ],

  // 紅方飛相開局的黑方應對
  相三進五: [
    { from: { x: 1, y: 0 }, to: { x: 2, y: 2 }, description: '馬八進七' },
    { from: { x: 7, y: 0 }, to: { x: 6, y: 2 }, description: '馬二進三' },
    { from: { x: 1, y: 7 }, to: { x: 1, y: 6 }, description: '炮八進一' },
    { from: { x: 7, y: 7 }, to: { x: 7, y: 6 }, description: '炮二進一' },
  ],

  // 紅方屏風馬開局的黑方應對
  馬二進三: [
    { from: { x: 1, y: 0 }, to: { x: 2, y: 2 }, description: '馬八進七' },
    { from: { x: 1, y: 7 }, to: { x: 1, y: 6 }, description: '炮八進一' },
    { from: { x: 2, y: 3 }, to: { x: 2, y: 4 }, description: '卒三進一' },
    { from: { x: 4, y: 3 }, to: { x: 4, y: 4 }, description: '卒五進一' },
  ],

  // 紅方順手炮的黑方應對
  炮二平六: [
    { from: { x: 7, y: 7 }, to: { x: 4, y: 7 }, description: '炮二平五' },
    { from: { x: 4, y: 3 }, to: { x: 4, y: 4 }, description: '卒五進一' },
    { from: { x: 1, y: 7 }, to: { x: 1, y: 5 }, description: '炮八進二' },
  ],

  // 默認應對，當找不到具體應對時使用
  default: [
    { from: { x: 1, y: 0 }, to: { x: 2, y: 2 }, description: '馬八進七' },
    { from: { x: 7, y: 0 }, to: { x: 6, y: 2 }, description: '馬二進三' },
    { from: { x: 2, y: 0 }, to: { x: 4, y: 1 }, description: '象三進五' },
    { from: { x: 6, y: 0 }, to: { x: 4, y: 1 }, description: '象七進五' },
    { from: { x: 0, y: 3 }, to: { x: 0, y: 4 }, description: '卒一進一' },
    { from: { x: 2, y: 3 }, to: { x: 2, y: 4 }, description: '卒三進一' },
    { from: { x: 4, y: 3 }, to: { x: 4, y: 4 }, description: '卒五進一' },
    { from: { x: 6, y: 3 }, to: { x: 6, y: 4 }, description: '卒七進一' },
    { from: { x: 8, y: 3 }, to: { x: 8, y: 4 }, description: '卒九進一' },
  ],
};

// 從大量棋局中學習的位置評估調整值 (未來可擴展)
export const LEARNED_POSITION_VALUES: { [key: string]: number } = {
  // 中盤有利布局
  車馬象士將士象馬車_炮_炮_兵兵兵兵兵_卒卒卒卒卒_砲_砲_車馬象士將士象馬車: 0, // 起始局面
  車_象士將士象馬車_炮_炮馬兵兵兵兵兵_卒卒卒卒卒_砲_砲_車馬象士將士象_車: 50, // 黑方馬八進七，佔據中心
  車馬象士將士象_車_炮_炮馬兵兵兵兵兵_卒卒卒卒_砲_砲_車馬象士將士象_車卒: 80, // 黑方卒七進一，威脅中路
};
