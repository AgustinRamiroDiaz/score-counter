export interface Player {
  id: string;
  name: string;
  aliases: string[];
}

export interface Round {
  id: string;
  number: number;
  scores: Record<string, number>;
}

export interface Game {
  id: string;
  name: string;
  createdAt: number;
  players: Player[];
  rounds: Round[];
}

export interface AppSettings {
  sttModel: string;
  llmModel: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface GameSummary {
  id: string;
  name: string;
  playerCount: number;
  roundCount: number;
}

export interface GameContext {
  mode: 'home' | 'game';
  gameName?: string;
  players?: Pick<Player, 'id' | 'name' | 'aliases'>[];
  rounds?: Round[];
  availableGames: GameSummary[];
}

// Worker message types
export type LLMWorkerInput =
  | { type: 'generate'; messages: ChatMessage[]; gameContext: GameContext }
  | { type: 'abort' };

export type LLMWorkerOutput =
  | { type: 'delta'; content: string }
  | { type: 'tool_call'; name: string; args: Record<string, unknown> }
  | { type: 'done' }
  | { type: 'status'; message: string; progress?: number }
  | { type: 'error'; message: string };

export type STTWorkerInput =
  | { type: 'transcribe'; audio: Float32Array; sampleRate: number }
  | { type: 'abort' };

export type STTWorkerOutput =
  | { type: 'transcript'; text: string }
  | { type: 'status'; message: string; progress?: number }
  | { type: 'error'; message: string };
