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

export interface MoveResult {
  success: boolean;
  captured?: ChessPiece;
  isCheck?: boolean;
  isCheckmate?: boolean;
  isStalemate?: boolean;
  gameOver?: boolean;
  winner?: PlayerColor;
  isSelfInCheck?: boolean;
}

export interface GameState {
  board: (ChessPiece | null)[][];
  currentPlayer: PlayerColor;
  selectedPiece: ChessPiece | null;
  validMoves: Position[];
  gameOver: boolean;
  winner: PlayerColor | null;
  moveHistory: string[];
  isInCheck: boolean;
  isSelfInCheck: boolean;
  isVsAI: boolean;
  aiIsThinking: boolean;
  aiThinkingText: string;
}
