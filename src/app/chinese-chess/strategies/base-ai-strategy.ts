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
            // 檢查移動是否會讓自己被將軍（非法移動）
            const move = { from: piece.position, to: moveTo };
            if (this.isMoveLegal(move, gameState, chessGameService)) {
              moves.push(move);
            }
          }
        }
      }
    }

    return moves;
  }

  // 檢查移動是否合法（不會讓自己被將軍）
  protected isMoveLegal(
    move: { from: Position; to: Position },
    gameState: GameState,
    chessGameService: ChessGameService
  ): boolean {
    const board = gameState.board;
    const piece = board[move.from.y][move.from.x];
    if (!piece) return false;

    // 模擬移動
    const originalTarget = board[move.to.y][move.to.x];
    const originalPos = piece.position;

    board[move.to.y][move.to.x] = piece;
    board[move.from.y][move.from.x] = null;
    piece.position = move.to;

    // 檢查是否會讓自己被將軍
    const wouldBeInCheck = chessGameService.isInCheck(board, piece.color);

    // 還原棋盤
    board[move.from.y][move.from.x] = piece;
    board[move.to.y][move.to.x] = originalTarget;
    piece.position = originalPos;

    return !wouldBeInCheck;
  }
}