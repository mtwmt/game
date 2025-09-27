export interface Position {
  x: number;
  y: number;
}

export enum PieceType {
  KING = 'king', // 將/帥
  ADVISOR = 'advisor', // 士/仕
  ELEPHANT = 'elephant', // 象/相
  HORSE = 'horse', // 馬
  ROOK = 'rook', // 車
  CANNON = 'cannon', // 砲/炮
  SOLDIER = 'soldier', // 兵/卒
}

export enum PlayerColor {
  RED = 'red',
  BLACK = 'black',
}

export interface ChessPiece {
  id: string;
  type: PieceType;
  color: PlayerColor;
  position: Position;
  isSelected: boolean;
  hasMoved: boolean;
}

export interface GameStatus {
  gameOver: boolean;
  winner: PlayerColor | null;
  isInCheck: boolean; // 對方被將軍
  isSelfInCheck: boolean; // 當前玩家被將軍
  isCheckmate: boolean;
  isStalemate: boolean;
}

export interface MoveResult {
  success: boolean;
  captured?: ChessPiece;
  status: GameStatus;
}

export interface AIState {
  isThinking: boolean;
  thinkingText: string;
}

export interface GameState {
  board: (ChessPiece | null)[][];
  currentPlayer: PlayerColor;
  selectedPiece: ChessPiece | null;
  validMoves: Position[];
  status: GameStatus;
  moveHistory: string[];
  isVsAI: boolean;
  aiState: AIState;
  hasApiKey: boolean;
}
