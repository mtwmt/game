export interface Position {
  x: number;
  y: number;
}

export interface Tile {
  id: number;
  petType: number;
  position: Position;
  selected: boolean;
}

export interface GameState {
  board: (Tile | null)[][];
  width: number;
  height: number;
  petTypes: number;
  score: number;
  level: number;
  moves: number;
  remainingTiles: number;
  gameStatus: GameStatus;
  levelStatus: LevelStatus;
  gameTime: number;
  countdownTime: number;
  // 道具系統
  totalShufflesUsed: number;
  totalHintsUsed: number;
  maxShufflesPerGame: number;
  maxHintsPerGame: number;
  // 提示系統
  hintTiles: Tile[];
  showHint: boolean;
}

export enum GameStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  TIME_UP = 'timeup',
  NO_MOVES = 'nomoves',
  COMPLETE = 'complete', // 全破關
}

export enum LevelStatus {
  PLAYING = 'playing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export type LevelType = 'classic' | 'down' | 'up' | 'left' | 'right';

export interface PathSegment {
  start: Position;
  end: Position;
  direction: 'horizontal' | 'vertical';
}

export interface MatchResult {
  success: boolean;
  path: PathSegment[] | null;
  tile1: Tile;
  tile2: Tile;
}

export interface GameRule {
  title: string;
  rules: string[];
}