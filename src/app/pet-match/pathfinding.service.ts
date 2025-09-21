import { Injectable } from '@angular/core';

export interface Position {
  x: number;
  y: number;
}

export interface PathSegment {
  start: Position;
  end: Position;
  direction: 'horizontal' | 'vertical';
}

export interface Tile {
  id: number;
  petType: number;
  position: Position;
  selected: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PathfindingService {

  findPath(start: Position, end: Position, board: (Tile | null)[][], boardWidth: number, boardHeight: number): PathSegment[] | null {
    // 嘗試各種路徑：直線 → L型 → 邊界
    return this.tryDirectPath(start, end, board, boardWidth, boardHeight) ||
           this.tryLShapePath(start, end, board, boardWidth, boardHeight) ||
           this.tryBoundaryPath(start, end, board, boardWidth, boardHeight);
  }

  // 直線路徑 (0轉彎)
  private tryDirectPath(start: Position, end: Position, board: (Tile | null)[][], boardWidth: number, boardHeight: number): PathSegment[] | null {
    if (start.y === end.y && this.isPathClear(start, end, 'horizontal', board, boardWidth, boardHeight)) {
      return [{ start, end, direction: 'horizontal' }];
    }
    if (start.x === end.x && this.isPathClear(start, end, 'vertical', board, boardWidth, boardHeight)) {
      return [{ start, end, direction: 'vertical' }];
    }
    return null;
  }

  // L型路徑 (1轉彎)
  private tryLShapePath(start: Position, end: Position, board: (Tile | null)[][], boardWidth: number, boardHeight: number): PathSegment[] | null {
    // L1: 先垂直後水平
    const corner1 = { x: start.x, y: end.y };
    if (this.isValidPosition(corner1, board, boardWidth, boardHeight) &&
        this.isPathClear(start, corner1, 'vertical', board, boardWidth, boardHeight) &&
        this.isPathClear(corner1, end, 'horizontal', board, boardWidth, boardHeight)) {
      return [
        { start, end: corner1, direction: 'vertical' },
        { start: corner1, end, direction: 'horizontal' }
      ];
    }

    // L2: 先水平後垂直
    const corner2 = { x: end.x, y: start.y };
    if (this.isValidPosition(corner2, board, boardWidth, boardHeight) &&
        this.isPathClear(start, corner2, 'horizontal', board, boardWidth, boardHeight) &&
        this.isPathClear(corner2, end, 'vertical', board, boardWidth, boardHeight)) {
      return [
        { start, end: corner2, direction: 'horizontal' },
        { start: corner2, end, direction: 'vertical' }
      ];
    }

    return null;
  }

  // 邊界路徑 (通過棋盤外圍)
  private tryBoundaryPath(start: Position, end: Position, board: (Tile | null)[][], boardWidth: number, boardHeight: number): PathSegment[] | null {
    const boundaries = [
      { y: -1, name: 'top' },
      { y: boardHeight, name: 'bottom' },
      { x: -1, name: 'left' },
      { x: boardWidth, name: 'right' }
    ];

    for (const boundary of boundaries) {
      const path = this.tryBoundaryRoute(start, end, boundary, board, boardWidth, boardHeight);
      if (path) return path;
    }

    return null;
  }

  private tryBoundaryRoute(start: Position, end: Position, boundary: any, board: (Tile | null)[][], boardWidth: number, boardHeight: number): PathSegment[] | null {
    if ('y' in boundary) {
      // 水平邊界 (上/下)
      const edgeStart = { x: start.x, y: boundary.y };
      const edgeEnd = { x: end.x, y: boundary.y };

      if (this.isPathClear(start, edgeStart, 'vertical', board, boardWidth, boardHeight) &&
          this.isPathClear(edgeStart, edgeEnd, 'horizontal', board, boardWidth, boardHeight) &&
          this.isPathClear(edgeEnd, end, 'vertical', board, boardWidth, boardHeight)) {
        return [
          { start, end: edgeStart, direction: 'vertical' },
          { start: edgeStart, end: edgeEnd, direction: 'horizontal' },
          { start: edgeEnd, end, direction: 'vertical' }
        ];
      }
    } else {
      // 垂直邊界 (左/右)
      const edgeStart = { x: boundary.x, y: start.y };
      const edgeEnd = { x: boundary.x, y: end.y };

      if (this.isPathClear(start, edgeStart, 'horizontal', board, boardWidth, boardHeight) &&
          this.isPathClear(edgeStart, edgeEnd, 'vertical', board, boardWidth, boardHeight) &&
          this.isPathClear(edgeEnd, end, 'horizontal', board, boardWidth, boardHeight)) {
        return [
          { start, end: edgeStart, direction: 'horizontal' },
          { start: edgeStart, end: edgeEnd, direction: 'vertical' },
          { start: edgeEnd, end, direction: 'horizontal' }
        ];
      }
    }

    return null;
  }

  // 統一的路徑檢查方法
  private isPathClear(start: Position, end: Position, direction: 'horizontal' | 'vertical', board: (Tile | null)[][], boardWidth: number, boardHeight: number): boolean {
    if (direction === 'horizontal') {
      if (start.y !== end.y) return false;
      const minX = Math.min(start.x, end.x);
      const maxX = Math.max(start.x, end.x);
      return this.checkLineEmpty(minX + 1, maxX, start.y, 'horizontal', board, boardWidth, boardHeight);
    } else {
      if (start.x !== end.x) return false;
      const minY = Math.min(start.y, end.y);
      const maxY = Math.max(start.y, end.y);
      return this.checkLineEmpty(minY + 1, maxY, start.x, 'vertical', board, boardWidth, boardHeight);
    }
  }

  private checkLineEmpty(start: number, end: number, fixed: number, direction: 'horizontal' | 'vertical', board: (Tile | null)[][], boardWidth: number, boardHeight: number): boolean {
    for (let i = start; i < end; i++) {
      const x = direction === 'horizontal' ? i : fixed;
      const y = direction === 'horizontal' ? fixed : i;

      if (x >= 0 && x < boardWidth && y >= 0 && y < boardHeight) {
        if (board[y][x]) return false;
      }
    }
    return true;
  }

  private isValidPosition(pos: Position, board: (Tile | null)[][], boardWidth: number, boardHeight: number): boolean {
    // 棋盤外的位置都有效 (邊界路徑)
    if (pos.x < 0 || pos.x >= boardWidth || pos.y < 0 || pos.y >= boardHeight) {
      return true;
    }
    // 棋盤內的位置必須是空的
    return !board[pos.y][pos.x];
  }
}