export interface AIStatus {
  uciEngine: boolean;
  geminiAI: boolean;
  legacyMinimax: boolean;
  engineReady: boolean;
  currentEngine: string | null;
}

export interface AIMode {
  value: 'auto' | 'uci-only' | 'gemini-only' | 'minimax-only' | 'mixed';
  label: string;
  icon: string;
}

export interface EngineInfo {
  name: string;
  difficulty: number;
  description: string;
}