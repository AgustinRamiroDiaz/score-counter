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

export interface GameSummary {
  id: string;
  name: string;
  playerCount: number;
  roundCount: number;
}

export type STTWorkerInput =
  | {
      type: "transcribe";
      audio: Float32Array;
      sampleRate: number;
      modelId?: string;
    }
  | { type: "load"; modelId: string }
  | { type: "abort" };

export type STTWorkerOutput =
  | { type: "transcript"; text: string }
  | { type: "status"; message: string; progress?: number }
  | { type: "error"; message: string };
