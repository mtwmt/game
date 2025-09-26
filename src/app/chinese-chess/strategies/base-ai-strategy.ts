import { PlayerColor, Position, GameState } from '../chess-piece.interface';
import { ChessGameService } from '../chess-game.service';

export interface AIStrategyResult {
  from: Position;
  to: Position;
  score?: number;
  analysis?: string;
}

export abstract class BaseAIStrategy {
  abstract readonly name: string;
  abstract readonly priority: number;

  abstract isAvailable(): Promise<boolean>;
  abstract makeMove(gameState: GameState): Promise<AIStrategyResult | null>;
  abstract getThinkingDescription(): string;

  // 共用的輔助方法
  protected isValidMove(
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

  protected getAllPossibleMoves(
    gameState: GameState,
    color: PlayerColor,
    chessGameService: ChessGameService
  ): { from: Position; to: Position }[] {
    const moves: { from: Position; to: Position }[] = [];
    const board = gameState.board;

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = board[y][x];
        if (piece && piece.color === color) {
          const possibleMoves = chessGameService.getPossibleMoves(piece, board);
          for (const moveTo of possibleMoves) {
            moves.push({ from: piece.position, to: moveTo });
          }
        }
      }
    }

    return moves;
  }
}