import { Injectable } from '@angular/core';
import { Tile, Position } from './pathfinding.service';

export interface GameStats {
  moves: number;
  time: number;
  remainingTiles: number;
  startTime: number;
}

@Injectable({
  providedIn: 'root'
})
export class GameLogicService {

  initializeBoard(boardWidth: number, boardHeight: number, petTypes: number): (Tile | null)[][] {
    const board: (Tile | null)[][] = [];
    let id = 0;

    // Create pairs of pets
    const totalTiles = boardWidth * boardHeight;
    const petPairs: number[] = [];

    // Ensure even number of tiles and create pairs
    for (let i = 0; i < totalTiles / 2; i++) {
      const petType = i % petTypes;
      petPairs.push(petType, petType);
    }

    // Shuffle the pets
    for (let i = petPairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [petPairs[i], petPairs[j]] = [petPairs[j], petPairs[i]];
    }

    // Fill the board
    let pairIndex = 0;
    for (let y = 0; y < boardHeight; y++) {
      board[y] = [];
      for (let x = 0; x < boardWidth; x++) {
        if (pairIndex < petPairs.length) {
          board[y][x] = {
            id: id++,
            petType: petPairs[pairIndex++],
            position: { x, y },
            selected: false,
          };
        } else {
          board[y][x] = null;
        }
      }
    }

    return board;
  }

  removeTiles(board: (Tile | null)[][], tile1: Tile, tile2: Tile): void {
    board[tile1.position.y][tile1.position.x] = null;
    board[tile2.position.y][tile2.position.x] = null;
  }

  collapseBoardDown(board: (Tile | null)[][], boardWidth: number, boardHeight: number): void {
    // 對每一列進行重力下降處理
    for (let x = 0; x < boardWidth; x++) {
      const column: (Tile | null)[] = [];

      // 從下往上收集非空方塊
      for (let y = boardHeight - 1; y >= 0; y--) {
        if (board[y][x]) {
          column.unshift(board[y][x]);
        }
      }

      // 重新填充該列：上方放空白，下方放方塊
      for (let y = 0; y < boardHeight; y++) {
        if (y < boardHeight - column.length) {
          // 上方填充空白
          board[y][x] = null;
        } else {
          // 下方填充方塊，並更新方塊座標位置
          const tile = column[y - (boardHeight - column.length)];
          if (tile) {
            tile.position = { x, y }; // 更新方塊座標
            board[y][x] = tile;
          }
        }
      }
    }
  }

  collapseBoardUp(board: (Tile | null)[][], boardWidth: number, boardHeight: number): void {
    // 對每一列進行向上補位處理
    for (let x = 0; x < boardWidth; x++) {
      const column: (Tile | null)[] = [];

      // 從上往下收集非空方塊
      for (let y = 0; y < boardHeight; y++) {
        if (board[y][x]) {
          column.push(board[y][x]);
        }
      }

      // 重新填充該列：上方放方塊，下方放空白
      for (let y = 0; y < boardHeight; y++) {
        if (y < column.length) {
          // 上方填充方塊，並更新方塊座標位置
          const tile = column[y];
          if (tile) {
            tile.position = { x, y }; // 更新方塊座標
            board[y][x] = tile;
          }
        } else {
          // 下方填充空白
          board[y][x] = null;
        }
      }
    }
  }

  collapseBoardLeft(board: (Tile | null)[][], boardWidth: number, boardHeight: number): void {
    // 對每一行進行向左補位處理
    for (let y = 0; y < boardHeight; y++) {
      const row: (Tile | null)[] = [];

      // 從左往右收集非空方塊
      for (let x = 0; x < boardWidth; x++) {
        if (board[y][x]) {
          row.push(board[y][x]);
        }
      }

      // 重新填充該行：左方放方塊，右方放空白
      for (let x = 0; x < boardWidth; x++) {
        if (x < row.length) {
          // 左方填充方塊，並更新方塊座標位置
          const tile = row[x];
          if (tile) {
            tile.position = { x, y }; // 更新方塊座標
            board[y][x] = tile;
          }
        } else {
          // 右方填充空白
          board[y][x] = null;
        }
      }
    }
  }

  collapseBoardRight(board: (Tile | null)[][], boardWidth: number, boardHeight: number): void {
    // 對每一行進行向右補位處理
    for (let y = 0; y < boardHeight; y++) {
      const row: (Tile | null)[] = [];

      // 從右往左收集非空方塊
      for (let x = boardWidth - 1; x >= 0; x--) {
        if (board[y][x]) {
          row.unshift(board[y][x]);
        }
      }

      // 重新填充該行：左方放空白，右方放方塊
      for (let x = 0; x < boardWidth; x++) {
        if (x < boardWidth - row.length) {
          // 左方填充空白
          board[y][x] = null;
        } else {
          // 右方填充方塊，並更新方塊座標位置
          const tile = row[x - (boardWidth - row.length)];
          if (tile) {
            tile.position = { x, y }; // 更新方塊座標
            board[y][x] = tile;
          }
        }
      }
    }
  }

  getRemainingTileCount(board: (Tile | null)[][]): number {
    return board.flat().filter(tile => tile !== null).length;
  }

  isGameComplete(board: (Tile | null)[][]): boolean {
    return this.getRemainingTileCount(board) === 0;
  }

  hasValidMoves(board: (Tile | null)[][], boardWidth: number, boardHeight: number, pathfindingService: any): boolean {
    // 檢查是否還有可配對的方塊
    for (let y1 = 0; y1 < boardHeight; y1++) {
      for (let x1 = 0; x1 < boardWidth; x1++) {
        const tile1 = board[y1][x1];
        if (!tile1) continue;

        for (let y2 = 0; y2 < boardHeight; y2++) {
          for (let x2 = 0; x2 < boardWidth; x2++) {
            const tile2 = board[y2][x2];
            if (!tile2 || tile1.id === tile2.id || tile1.petType !== tile2.petType) continue;

            if (pathfindingService.findPath(tile1.position, tile2.position, board, boardWidth, boardHeight)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  getElapsedTime(startTime: number): number {
    return Math.floor((Date.now() - startTime) / 1000);
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
