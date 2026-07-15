'use client';

import { useChat as useVercelChat } from '@ai-sdk/react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { transformersJS } from '@browser-ai/transformers-js';
import { createOllama } from 'ai-sdk-ollama';
import { DirectChatTransport, ToolLoopAgent, isStepCount } from 'ai';
import { useGameStore } from '@/lib/store/gameStore';
import { useModelDownloadStore } from '@/lib/store/modelDownloadStore';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { createTools } from '@/lib/ai/tools';
import { isModelCached } from '@/lib/config/models';
import type { Game, GameSummary, LLMBackend } from '@/lib/types';
import type { ChatTransport, LanguageModel, ToolSet, UIMessage, UIMessageChunk } from 'ai';
import type { ToolStore } from '@/lib/ai/tools';

interface BrowserLLMSnapshot {
  backend: LLMBackend;
  modelId: string;
  ollamaUrl: string;
  ollamaModel: string;
  games: Game[];
  currentGame: Game | undefined;
  tools: ToolSet;
  showDialog: (params: {
    modelId: string;
    modelType: 'llm';
    confirmDownload: () => void;
    cancelDownload: () => void;
  }) => void;
  hideDialog: () => void;
  updateStatus: (status: string, progress?: number) => void;
}

function buildSystemPrompt(games: Game[], currentGame: Game | undefined): string {
  const availableGames: GameSummary[] = games.map((g) => ({
    id: g.id,
    name: g.name,
    playerCount: g.players.length,
    roundCount: g.rounds.length,
  }));

  if (!currentGame) {
    const gameList =
      availableGames.length > 0
        ? availableGames
            .map((g) => `- "${g.name}" (${g.playerCount} players, ${g.roundCount} rounds)`)
            .join('\n')
        : '  (none yet)';

    return `You are a friendly score-tracking assistant. You help users create and manage round-based games.

Existing games:
${gameList}

Use the available tools to create games when the user asks. Collect a game name and at least two player names before creating a game.

If no tool is needed, respond conversationally in one or two concise sentences.`;
  }

  const playerList = currentGame.players
    .map((p) => `- ${p.name}${p.aliases.length ? ` (aliases: ${p.aliases.join(', ')})` : ''}`)
    .join('\n');

  return `You are a scoring assistant for the game "${currentGame.name}".

Players:
${playerList || '  (none)'}

Rounds played: ${currentGame.rounds.length}

Use the available tools to score rounds, correct rounds, undo the last round, inspect the leaderboard, update players, create games, or navigate views.

IMPORTANT for add_round: include a score for every player. If any score is missing, ask before calling the tool.

If no tool is needed, respond conversationally in one or two concise sentences.`;
}

function normalizeOllamaUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  return trimmed.length > 0 ? trimmed : 'http://localhost:11434';
}

class BrowserAgentTransport implements ChatTransport<UIMessage> {
  private worker: Worker | null = null;

  constructor(private snapshot: BrowserLLMSnapshot) {}

  setSnapshot(snapshot: BrowserLLMSnapshot) {
    this.snapshot = snapshot;
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
  }

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('../lib/workers/llm.worker.ts', import.meta.url));
    }
    return this.worker;
  }

  private async confirmDownloadIfNeeded(modelId: string): Promise<boolean> {
    if (await isModelCached(modelId)) return true;

    return new Promise<boolean>((resolve) => {
      this.snapshot.showDialog({
        modelId,
        modelType: 'llm',
        confirmDownload: () => resolve(true),
        cancelDownload: () => {
          this.snapshot.hideDialog();
          resolve(false);
        },
      });
    });
  }

  private async createModel(): Promise<LanguageModel | null> {
    if (this.snapshot.backend === 'ollama') {
      const model = this.snapshot.ollamaModel.trim();
      if (!model) throw new Error('Enter an Ollama model name in Settings.');
      return createOllama({ baseURL: normalizeOllamaUrl(this.snapshot.ollamaUrl) })(model);
    }

    const confirmed = await this.confirmDownloadIfNeeded(this.snapshot.modelId);
    if (!confirmed) return null;

    return transformersJS(this.snapshot.modelId, {
      worker: this.getWorker(),
      device: 'auto',
      initProgressCallback: (progress) => {
        this.snapshot.updateStatus('Loading model...', progress);
      },
    });
  }

  async sendMessages(
    options: Parameters<ChatTransport<UIMessage>['sendMessages']>[0],
  ): Promise<ReadableStream<UIMessageChunk>> {
    try {
      const model = await this.createModel();

      if (!model) {
        return new ReadableStream<UIMessageChunk>({
          start(controller) {
            controller.close();
          },
        });
      }

      const agent = new ToolLoopAgent({
        model,
        instructions: buildSystemPrompt(this.snapshot.games, this.snapshot.currentGame),
        tools: this.snapshot.tools,
        stopWhen: isStepCount(5),
        maxOutputTokens: 512,
        temperature: 0.3,
        providerOptions:
          this.snapshot.backend === 'transformers'
            ? {
                'transformers-js': {
                  maxNewTokens: 512,
                },
              }
            : undefined,
        onEnd: () => {
          this.snapshot.hideDialog();
          this.snapshot.updateStatus('');
        },
      });

      const transport = new DirectChatTransport({ agent }) as ChatTransport<UIMessage>;
      return transport.sendMessages(options);
    } catch (err) {
      this.snapshot.updateStatus('error');
      throw err;
    }
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null;
  }
}

export function useChat() {
  const router = useRouter();
  const games = useGameStore((s) => s.games);
  const llmModel = useSettingsStore((s) => s.llmModel);
  const llmBackend = useSettingsStore((s) => s.llmBackend);
  const ollamaUrl = useSettingsStore((s) => s.ollamaUrl);
  const ollamaModel = useSettingsStore((s) => s.ollamaModel);
  const { showDialog, hideDialog, updateStatus } = useModelDownloadStore();
  const addRound = useGameStore((s) => s.addRound);
  const updateRound = useGameStore((s) => s.updateRound);
  const undoLastRound = useGameStore((s) => s.undoLastRound);
  const updatePlayer = useGameStore((s) => s.updatePlayer);
  const createGame = useGameStore((s) => s.createGame);

  const searchParams = useSearchParams();
  const currentGameId = searchParams.get('id') || undefined;
  const currentGame = useMemo(
    () => (currentGameId ? games.find((g) => g.id === currentGameId) : undefined),
    [currentGameId, games],
  );

  const store: ToolStore = useMemo(
    () => ({ addRound, updateRound, undoLastRound, updatePlayer, createGame }),
    [addRound, updateRound, undoLastRound, updatePlayer, createGame],
  );

  const navigate = useMemo(
    () => (view: string, gameId?: string) => {
      const targetId = gameId ?? currentGameId;
      if (targetId) {
        const path = view === 'scoring' ? '/game' : `/game/${view}`;
        router.push(`${path}?id=${targetId}`);
      } else {
        router.push('/');
      }
    },
    [currentGameId, router],
  );

  const tools = useMemo(
    () => createTools(currentGame, store, navigate),
    [currentGame, navigate, store],
  );

  const [transport] = useState(
    () =>
      new BrowserAgentTransport({
        backend: llmBackend,
        modelId: llmModel,
        ollamaUrl,
        ollamaModel,
        games,
        currentGame,
        tools,
        showDialog,
        hideDialog,
        updateStatus,
      }),
  );

  useEffect(() => {
    transport.setSnapshot({
      backend: llmBackend,
      modelId: llmModel,
      ollamaUrl,
      ollamaModel,
      games,
      currentGame,
      tools,
      showDialog,
      hideDialog,
      updateStatus,
    });
  }, [
    currentGame,
    games,
    hideDialog,
    llmBackend,
    llmModel,
    ollamaModel,
    ollamaUrl,
    showDialog,
    tools,
    transport,
    updateStatus,
  ]);

  useEffect(() => () => transport.terminate(), [transport]);

  const chat = useVercelChat({
    transport,
  });

  return { ...chat, currentGameId };
}
