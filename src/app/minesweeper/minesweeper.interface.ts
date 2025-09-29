export interface Position {
  x: number;
  y: number;
}

export interface Cell {
  position: Position;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMineCount: number;
  id: string;
}

export interface GameState {
  board: Cell[][];
  width: number;
  height: number;
  mineCount: number;
  revealedCount: number;
  flaggedCount: number;
  gameStatus: GameStatus;
  gameTime: number;
  isFirstClick: boolean;
  difficulty: Difficulty;
  triggeredMinePosition?: Position; // 觸發失敗的地雷位置
}

export enum GameStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  WON = 'won',
  LOST = 'lost',
}

export enum Difficulty {
  BEGINNER = 'beginner',    // 9x9, 10 mines
  INTERMEDIATE = 'intermediate', // 16x16, 40 mines
  EXPERT = 'expert',        // 30x16, 99 mines
  CUSTOM = 'custom',
}

export interface DifficultyConfig {
  width: number;
  height: number;
  mineCount: number;
  name: string;
}

export interface GameResult {
  won: boolean;
  gameTime: number;
  difficulty: Difficulty;
  flagsUsed: number;
}

export interface MoveResult {
  success: boolean;
  gameOver: boolean;
  cellsRevealed: Position[];
  gameStatus: GameStatus;
}

export interface GameRule {
  title: string;
  rules: string[];
}