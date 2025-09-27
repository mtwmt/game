import { PlayerColor, Position, GameState } from '../chess-piece.interface';

export interface AIStrategyResult {
  from: Position;
  to: Position;
  score?: number;
  analysis?: string;
}

/**
 * 簡化的 AI 策略基類
 * 移除了所有象棋邏輯，專注於 AI 策略介面
 * 所有象棋邏輯現在統一在 ChessGameService 中處理
 */
export abstract class BaseAIStrategy {
  abstract readonly name: string;
  abstract readonly priority: number;

  abstract isAvailable(): Promise<boolean>;
  abstract makeMove(gameState: GameState): Promise<AIStrategyResult | null>;
  abstract getThinkingDescription(): string;
}