import { Injectable } from '@angular/core';
import { ChessPiece, PieceType, PlayerColor, Position, MoveResult, GameState } from './chess-piece.interface';

@Injectable({
  providedIn: 'root'
})
export class ChessGameService {

  initializeBoard(): (ChessPiece | null)[][] {
    const board: (ChessPiece | null)[][] = Array(10).fill(null).map(() => Array(9).fill(null));

    // 紅方（下方）
    board[9][0] = { id: 'r-chariot-1', type: PieceType.CHARIOT, color: PlayerColor.RED, position: { x: 0, y: 9 }, isSelected: false, hasMoved: false };
    board[9][1] = { id: 'r-horse-1', type: PieceType.HORSE, color: PlayerColor.RED, position: { x: 1, y: 9 }, isSelected: false, hasMoved: false };
    board[9][2] = { id: 'r-elephant-1', type: PieceType.ELEPHANT, color: PlayerColor.RED, position: { x: 2, y: 9 }, isSelected: false, hasMoved: false };
    board[9][3] = { id: 'r-advisor-1', type: PieceType.ADVISOR, color: PlayerColor.RED, position: { x: 3, y: 9 }, isSelected: false, hasMoved: false };
    board[9][4] = { id: 'r-general', type: PieceType.GENERAL, color: PlayerColor.RED, position: { x: 4, y: 9 }, isSelected: false, hasMoved: false };
    board[9][5] = { id: 'r-advisor-2', type: PieceType.ADVISOR, color: PlayerColor.RED, position: { x: 5, y: 9 }, isSelected: false, hasMoved: false };
    board[9][6] = { id: 'r-elephant-2', type: PieceType.ELEPHANT, color: PlayerColor.RED, position: { x: 6, y: 9 }, isSelected: false, hasMoved: false };
    board[9][7] = { id: 'r-horse-2', type: PieceType.HORSE, color: PlayerColor.RED, position: { x: 7, y: 9 }, isSelected: false, hasMoved: false };
    board[9][8] = { id: 'r-chariot-2', type: PieceType.CHARIOT, color: PlayerColor.RED, position: { x: 8, y: 9 }, isSelected: false, hasMoved: false };

    board[7][1] = { id: 'r-cannon-1', type: PieceType.CANNON, color: PlayerColor.RED, position: { x: 1, y: 7 }, isSelected: false, hasMoved: false };
    board[7][7] = { id: 'r-cannon-2', type: PieceType.CANNON, color: PlayerColor.RED, position: { x: 7, y: 7 }, isSelected: false, hasMoved: false };

    for (let x = 0; x < 9; x += 2) {
      board[6][x] = { id: `r-soldier-${x}`, type: PieceType.SOLDIER, color: PlayerColor.RED, position: { x, y: 6 }, isSelected: false, hasMoved: false };
    }

    // 黑方（上方）
    board[0][0] = { id: 'b-chariot-1', type: PieceType.CHARIOT, color: PlayerColor.BLACK, position: { x: 0, y: 0 }, isSelected: false, hasMoved: false };
    board[0][1] = { id: 'b-horse-1', type: PieceType.HORSE, color: PlayerColor.BLACK, position: { x: 1, y: 0 }, isSelected: false, hasMoved: false };
    board[0][2] = { id: 'b-elephant-1', type: PieceType.ELEPHANT, color: PlayerColor.BLACK, position: { x: 2, y: 0 }, isSelected: false, hasMoved: false };
    board[0][3] = { id: 'b-advisor-1', type: PieceType.ADVISOR, color: PlayerColor.BLACK, position: { x: 3, y: 0 }, isSelected: false, hasMoved: false };
    board[0][4] = { id: 'b-general', type: PieceType.GENERAL, color: PlayerColor.BLACK, position: { x: 4, y: 0 }, isSelected: false, hasMoved: false };
    board[0][5] = { id: 'b-advisor-2', type: PieceType.ADVISOR, color: PlayerColor.BLACK, position: { x: 5, y: 0 }, isSelected: false, hasMoved: false };
    board[0][6] = { id: 'b-elephant-2', type: PieceType.ELEPHANT, color: PlayerColor.BLACK, position: { x: 6, y: 0 }, isSelected: false, hasMoved: false };
    board[0][7] = { id: 'b-horse-2', type: PieceType.HORSE, color: PlayerColor.BLACK, position: { x: 7, y: 0 }, isSelected: false, hasMoved: false };
    board[0][8] = { id: 'b-chariot-2', type: PieceType.CHARIOT, color: PlayerColor.BLACK, position: { x: 8, y: 0 }, isSelected: false, hasMoved: false };

    board[2][1] = { id: 'b-cannon-1', type: PieceType.CANNON, color: PlayerColor.BLACK, position: { x: 1, y: 2 }, isSelected: false, hasMoved: false };
    board[2][7] = { id: 'b-cannon-2', type: PieceType.CANNON, color: PlayerColor.BLACK, position: { x: 7, y: 2 }, isSelected: false, hasMoved: false };

    for (let x = 0; x < 9; x += 2) {
      board[3][x] = { id: `b-soldier-${x}`, type: PieceType.SOLDIER, color: PlayerColor.BLACK, position: { x, y: 3 }, isSelected: false, hasMoved: false };
    }

    return board;
  }

  initializeGameState(): GameState {
    return {
      board: this.initializeBoard(),
      currentPlayer: PlayerColor.RED,
      selectedPiece: null,
      validMoves: [],
      gameOver: false,
      winner: null,
      moveHistory: [],
      isInCheck: false,
      isVsAI: false,
      aiIsThinking: false,
      aiThinkingText: ''
    };
  }

  isValidPosition(x: number, y: number): boolean {
    return x >= 0 && x < 9 && y >= 0 && y < 10;
  }

  isInPalace(x: number, y: number, color: PlayerColor): boolean {
    if (color === PlayerColor.RED) {
      return x >= 3 && x <= 5 && y >= 7 && y <= 9;
    } else {
      return x >= 3 && x <= 5 && y >= 0 && y <= 2;
    }
  }

  isOnOwnSide(y: number, color: PlayerColor): boolean {
    if (color === PlayerColor.RED) {
      return y >= 5;
    } else {
      return y <= 4;
    }
  }

  getPossibleMoves(piece: ChessPiece, board: (ChessPiece | null)[][]): Position[] {
    const moves: Position[] = [];
    const { x, y } = piece.position;

    switch (piece.type) {
      case PieceType.GENERAL:
        // 將/帥：只能在九宮格內移動，每次只能走一格
        const generalMoves = [
          { x: x - 1, y }, { x: x + 1, y },
          { x, y: y - 1 }, { x, y: y + 1 }
        ];
        generalMoves.forEach(move => {
          if (this.isValidPosition(move.x, move.y) && this.isInPalace(move.x, move.y, piece.color)) {
            const target = board[move.y][move.x];
            if (!target || target.color !== piece.color) {
              moves.push(move);
            }
          }
        });
        break;

      case PieceType.ADVISOR:
        // 士/仕：只能在九宮格內斜走
        const advisorMoves = [
          { x: x - 1, y: y - 1 }, { x: x + 1, y: y - 1 },
          { x: x - 1, y: y + 1 }, { x: x + 1, y: y + 1 }
        ];
        advisorMoves.forEach(move => {
          if (this.isValidPosition(move.x, move.y) && this.isInPalace(move.x, move.y, piece.color)) {
            const target = board[move.y][move.x];
            if (!target || target.color !== piece.color) {
              moves.push(move);
            }
          }
        });
        break;

      case PieceType.ELEPHANT:
        // 象/相：走「田」字，不能過河
        const elephantMoves = [
          { x: x - 2, y: y - 2, block: { x: x - 1, y: y - 1 } },
          { x: x + 2, y: y - 2, block: { x: x + 1, y: y - 1 } },
          { x: x - 2, y: y + 2, block: { x: x - 1, y: y + 1 } },
          { x: x + 2, y: y + 2, block: { x: x + 1, y: y + 1 } }
        ];
        elephantMoves.forEach(move => {
          if (this.isValidPosition(move.x, move.y) && this.isOnOwnSide(move.y, piece.color)) {
            // 檢查塞象眼
            if (!board[move.block.y][move.block.x]) {
              const target = board[move.y][move.x];
              if (!target || target.color !== piece.color) {
                moves.push({ x: move.x, y: move.y });
              }
            }
          }
        });
        break;

      case PieceType.HORSE:
        // 馬：走「日」字
        const horseMoves = [
          { x: x - 1, y: y - 2, block: { x, y: y - 1 } },
          { x: x + 1, y: y - 2, block: { x, y: y - 1 } },
          { x: x - 1, y: y + 2, block: { x, y: y + 1 } },
          { x: x + 1, y: y + 2, block: { x, y: y + 1 } },
          { x: x - 2, y: y - 1, block: { x: x - 1, y } },
          { x: x - 2, y: y + 1, block: { x: x - 1, y } },
          { x: x + 2, y: y - 1, block: { x: x + 1, y } },
          { x: x + 2, y: y + 1, block: { x: x + 1, y } }
        ];
        horseMoves.forEach(move => {
          if (this.isValidPosition(move.x, move.y)) {
            // 檢查蹩馬腿
            if (!board[move.block.y][move.block.x]) {
              const target = board[move.y][move.x];
              if (!target || target.color !== piece.color) {
                moves.push({ x: move.x, y: move.y });
              }
            }
          }
        });
        break;

      case PieceType.CHARIOT:
        // 車：直線移動
        const directions = [
          { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
          { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
        ];
        directions.forEach(dir => {
          for (let i = 1; i < 10; i++) {
            const newX = x + dir.dx * i;
            const newY = y + dir.dy * i;
            if (!this.isValidPosition(newX, newY)) break;

            const target = board[newY][newX];
            if (target) {
              if (target.color !== piece.color) {
                moves.push({ x: newX, y: newY });
              }
              break;
            } else {
              moves.push({ x: newX, y: newY });
            }
          }
        });
        break;

      case PieceType.CANNON:
        // 砲：跳吃
        const cannonDirections = [
          { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
          { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
        ];
        cannonDirections.forEach(dir => {
          let hasJumped = false;
          for (let i = 1; i < 10; i++) {
            const newX = x + dir.dx * i;
            const newY = y + dir.dy * i;
            if (!this.isValidPosition(newX, newY)) break;

            const target = board[newY][newX];
            if (target) {
              if (!hasJumped) {
                hasJumped = true;
              } else {
                if (target.color !== piece.color) {
                  moves.push({ x: newX, y: newY });
                }
                break;
              }
            } else if (!hasJumped) {
              moves.push({ x: newX, y: newY });
            }
          }
        });
        break;

      case PieceType.SOLDIER:
        // 兵/卒：向前走，過河後可橫走
        const forward = piece.color === PlayerColor.RED ? -1 : 1;
        const forwardMove = { x, y: y + forward };

        if (this.isValidPosition(forwardMove.x, forwardMove.y)) {
          const target = board[forwardMove.y][forwardMove.x];
          if (!target || target.color !== piece.color) {
            moves.push(forwardMove);
          }
        }

        // 過河後可橫走
        if (!this.isOnOwnSide(y, piece.color)) {
          const leftMove = { x: x - 1, y };
          const rightMove = { x: x + 1, y };

          if (this.isValidPosition(leftMove.x, leftMove.y)) {
            const target = board[leftMove.y][leftMove.x];
            if (!target || target.color !== piece.color) {
              moves.push(leftMove);
            }
          }

          if (this.isValidPosition(rightMove.x, rightMove.y)) {
            const target = board[rightMove.y][rightMove.x];
            if (!target || target.color !== piece.color) {
              moves.push(rightMove);
            }
          }
        }
        break;
    }

    return moves;
  }

  isInCheck(board: (ChessPiece | null)[][], color: PlayerColor): boolean {
    // 找到將/帥的位置
    let generalPos: Position | null = null;
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = board[y][x];
        if (piece && piece.type === PieceType.GENERAL && piece.color === color) {
          generalPos = { x, y };
          break;
        }
      }
    }

    if (!generalPos) return false;

    // 檢查是否被敵方棋子攻擊
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = board[y][x];
        if (piece && piece.color !== color) {
          const possibleMoves = this.getPossibleMoves(piece, board);
          if (possibleMoves.some(move => move.x === generalPos!.x && move.y === generalPos!.y)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  makeMove(gameState: GameState, from: Position, to: Position): MoveResult {
    const { board } = gameState;
    const piece = board[from.y][from.x];

    if (!piece) {
      return { success: false };
    }

    const targetPiece = board[to.y][to.x];

    // 模擬移動
    board[to.y][to.x] = piece;
    board[from.y][from.x] = null;
    piece.position = to;

    // 檢查移動後是否將軍自己
    if (this.isInCheck(board, piece.color)) {
      // 還原移動
      board[from.y][from.x] = piece;
      board[to.y][to.x] = targetPiece;
      piece.position = from;
      return { success: false };
    }

    // 檢查是否將軍對方
    const oppositeColor = piece.color === PlayerColor.RED ? PlayerColor.BLACK : PlayerColor.RED;
    const isCheck = this.isInCheck(board, oppositeColor);

    piece.hasMoved = true;

    return {
      success: true,
      captured: targetPiece || undefined,
      isCheck
    };
  }

  getPieceSymbol(piece: ChessPiece): string {
    const symbols: Record<PieceType, { red: string; black: string }> = {
      [PieceType.GENERAL]: { red: '帥', black: '將' },
      [PieceType.ADVISOR]: { red: '仕', black: '士' },
      [PieceType.ELEPHANT]: { red: '相', black: '象' },
      [PieceType.HORSE]: { red: '馬', black: '馬' },
      [PieceType.CHARIOT]: { red: '車', black: '車' },
      [PieceType.CANNON]: { red: '炮', black: '砲' },
      [PieceType.SOLDIER]: { red: '兵', black: '卒' }
    };

    return symbols[piece.type][piece.color];
  }
}