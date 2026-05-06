'use client';

import { useChat as useVercelChat } from '@ai-sdk/react';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { transformersJS } from '@browser-ai/transformers-js';
import { useGameStore } from '@/lib/store/gameStore';
import { useModelDownloadStore } from '@/lib/store/modelDownloadStore';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { createTools } from '@/lib/ai/tools';
import { convertToModelMessages, stepCountIs, streamText } from 'ai';
import { isModelCached } from '@/lib/config/models';
import type { Game, GameSummary } from '@/lib/types';
import type { ChatTransport, ToolSet, UIMessage, UIMessageChunk } from 'ai';

interface BrowserLLMSnapshot {
  modelId: string;
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

class BrowserLLMTransport implements ChatTransport<UIMessage> {
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

  async sendMessages({
    messages,
    abortSignal,
  }: Parameters<ChatTransport<UIMessage>['sendMessages']>[0]): Promise<ReadableStream<UIMessageChunk>> {
    const { modelId, games, currentGame, tools, updateStatus, hideDialog } = this.snapshot;
    const confirmed = await this.confirmDownloadIfNeeded(modelId);

    if (!confirmed) {
      return new ReadableStream<UIMessageChunk>({
        start(controller) {
          controller.close();
        },
      });
    }

    const model = transformersJS(modelId, {
      worker: this.getWorker(),
      device: 'auto',
      initProgressCallback: (progress) => {
        updateStatus('Loading model...', Math.round(progress * 100));
      },
    });

    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model,
      system: buildSystemPrompt(games, currentGame),
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(5),
      abortSignal,
      maxOutputTokens: 512,
      temperature: 0.3,
      providerOptions: {
        'transformers-js': {
          maxNewTokens: 512,
        },
      },
      onFinish: () => {
        hideDialog();
      },
      onError: () => {
        updateStatus('error');
      },
    });

    return result.toUIMessageStream();
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null;
  }
}

export function useChat() {
  const router = useRouter();
  const pathname = usePathname();
  const games = useGameStore((s) => s.games);
  const llmModel = useSettingsStore((s) => s.llmModel);
  const { showDialog, hideDialog, updateStatus } = useModelDownloadStore();
  const addRound = useGameStore((s) => s.addRound);
  const updateRound = useGameStore((s) => s.updateRound);
  const undoLastRound = useGameStore((s) => s.undoLastRound);
  const updatePlayer = useGameStore((s) => s.updatePlayer);
  const createGame = useGameStore((s) => s.createGame);

  const currentGameId = pathname?.match(/\/game\/([^/]+)/)?.[1];
  const currentGame = useMemo(
    () => (currentGameId ? games.find((g) => g.id === currentGameId) : undefined),
    [currentGameId, games],
  );

  const store = useMemo(
    () => ({ addRound, updateRound, undoLastRound, updatePlayer, createGame }),
    [addRound, updateRound, undoLastRound, updatePlayer, createGame],
  );

  const tools = useMemo(
    () =>
      createTools(currentGame, store, (view: string, gameId?: string) => {
        const targetId = gameId ?? currentGameId;
        if (targetId) {
          router.push(`/game/${targetId}${view === 'scoring' ? '' : `/${view}`}`);
        } else {
          router.push('/');
        }
      }),
    [currentGame, currentGameId, router, store],
  );

  const [transport] = useState(
    () =>
      new BrowserLLMTransport({
        modelId: llmModel,
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
      modelId: llmModel,
      games,
      currentGame,
      tools,
      showDialog,
      hideDialog,
      updateStatus,
    });
  }, [currentGame, games, hideDialog, llmModel, showDialog, tools, transport, updateStatus]);

  useEffect(() => () => transport.terminate(), [transport]);

  const chat = useVercelChat({
    transport,
  });

  return { ...chat, currentGameId };
}
