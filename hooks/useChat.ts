'use client';

import { useChat as useVercelChat } from '@ai-sdk/react';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { transformersJS } from '@browser-ai/transformers-js';
import { useGameStore } from '@/lib/store/gameStore';
import { useModelDownloadStore } from '@/lib/store/modelDownloadStore';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { buildLeaderboard, createTools } from '@/lib/ai/tools';
import { getRememberedMediaPipeModelFile } from '@/lib/ai/mediapipeModelFile';
import { convertToModelMessages, createUIMessageStream, stepCountIs, streamText } from 'ai';
import { isModelCached } from '@/lib/config/models';
import type { Game, GameSummary, LLMBackend, Player } from '@/lib/types';
import type { ChatTransport, ToolSet, UIMessage, UIMessageChunk, UIMessageStreamWriter } from 'ai';
import type { ToolStore } from '@/lib/ai/tools';

interface BrowserLLMSnapshot {
  backend: LLMBackend;
  modelId: string;
  games: Game[];
  currentGame: Game | undefined;
  tools: ToolSet;
  store: ToolStore;
  navigate: (view: string, gameId?: string) => void;
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

type MediaPipeLLMWorkerOutput =
  | { type: 'status'; message: string; progress?: number }
  | { type: 'ready' }
  | { type: 'delta'; requestId: string; text: string }
  | { type: 'done'; requestId: string; text: string }
  | { type: 'error'; requestId?: string; message: string };

const MEDIAPIPE_TOOL_DECISION_MAX_TOKENS = 512;
const MEDIAPIPE_FINAL_RESPONSE_MAX_TOKENS = 768;

type MediaPipeToolName =
  | 'create_game'
  | 'add_round'
  | 'update_round'
  | 'undo_last_round'
  | 'get_leaderboard'
  | 'update_player'
  | 'navigate';

interface MediaPipeToolRequest {
  tool: MediaPipeToolName;
  input?: unknown;
}

interface MediaPipeToolResult {
  success: boolean;
  message: string;
  data?: unknown;
}

function resolvePlayer(name: string, players: Player[]): Player | undefined {
  const lower = name.toLowerCase();
  return players.find(
    (p) => p.name.toLowerCase() === lower || p.aliases.some((alias) => alias.toLowerCase() === lower),
  );
}

function recordFromUnknown(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function numberRecordFromUnknown(value: unknown): Record<string, number> {
  const input = recordFromUnknown(value);
  return Object.fromEntries(
    Object.entries(input).filter((entry): entry is [string, number] => typeof entry[1] === 'number'),
  );
}

function stringArrayFromUnknown(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : undefined;
}

function parseMediaPipeToolRequest(text: string): MediaPipeToolRequest | { response: string } {
  const trimmed = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  const parsed = JSON.parse(trimmed) as unknown;
  const object = recordFromUnknown(parsed);
  if (typeof object.response === 'string') return { response: object.response };
  if (typeof object.tool !== 'string') throw new Error('No tool name in model response.');

  const toolNames: MediaPipeToolName[] = [
    'create_game',
    'add_round',
    'update_round',
    'undo_last_round',
    'get_leaderboard',
    'update_player',
    'navigate',
  ];
  if (!toolNames.includes(object.tool as MediaPipeToolName)) {
    throw new Error(`Unknown tool: ${object.tool}`);
  }
  return { tool: object.tool as MediaPipeToolName, input: object.input };
}

function extractMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('');
}

function buildMediaPipePrompt(
  games: Game[],
  currentGame: Game | undefined,
  messages: UIMessage[],
  toolResults: MediaPipeToolResult[],
  mode: 'tool' | 'final',
): string {
  const latestUserText = [...messages]
    .reverse()
    .find((message) => message.role === 'user');
  const userText = latestUserText ? extractMessageText(latestUserText) : '';
  const toolResultText =
    toolResults.length > 0
      ? toolResults.map((result, index) => `${index + 1}. ${JSON.stringify(result)}`).join('\n')
      : 'none';

  if (mode === 'final') {
    return `User: ${userText}
Tool results: ${toolResultText}
Answer in one short sentence.`;
  }

  if (!currentGame) {
    const gameNames = games.map((game) => game.name).join(', ') || 'none';
    return `Return strict JSON only.
Existing games: ${gameNames}
If user asks to create a game, output:
{"tool":"create_game","input":{"name":"Game name","players":[{"name":"Alice","aliases":[]},{"name":"Bob","aliases":[]}]}}
Otherwise output {"response":"short answer"}.
User: ${userText}`;
  }

  const playerNames = currentGame.players.map((player) => player.name).join(', ');
  return `Return strict JSON only.
Game: ${currentGame.name}
Players: ${playerNames}
Tools: add_round {"scores":{"Name":1}}, undo_last_round {}, get_leaderboard {}, navigate {"view":"scoring|leaderboard|chart|table"}.
If no tool is needed output {"response":"short answer"}.
User: ${userText}`;
}

async function executeMediaPipeTool(
  request: MediaPipeToolRequest,
  snapshot: BrowserLLMSnapshot,
): Promise<MediaPipeToolResult> {
  const input = recordFromUnknown(request.input);
  const game = snapshot.currentGame;

  if (request.tool === 'create_game') {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    const playersInput = Array.isArray(input.players) ? input.players : [];
    const players = playersInput
      .map((player) => {
        const playerInput = recordFromUnknown(player);
        return {
          name: typeof playerInput.name === 'string' ? playerInput.name.trim() : '',
          aliases: stringArrayFromUnknown(playerInput.aliases) ?? [],
        };
      })
      .filter((player) => player.name.length > 0);

    if (!name || players.length < 2) {
      return { success: false, message: 'A game name and at least two players are required.' };
    }
    const newId = snapshot.store.createGame(name, players);
    snapshot.navigate('scoring', newId);
    return { success: true, message: `Game "${name}" created with ${players.length} players.` };
  }

  if (!game) return { success: false, message: 'No active game.' };

  if (request.tool === 'add_round') {
    const scores = numberRecordFromUnknown(input.scores);
    const resolvedScores: Record<string, number> = {};
    const missing: string[] = [];

    for (const player of game.players) {
      const match = Object.entries(scores).find(([name]) => resolvePlayer(name, game.players)?.id === player.id);
      if (match) {
        resolvedScores[player.id] = match[1];
      } else {
        missing.push(player.name);
      }
    }
    if (missing.length > 0) return { success: false, message: `Missing scores for: ${missing.join(', ')}` };
    snapshot.store.addRound(game.id, resolvedScores);
    return { success: true, message: `Round ${game.rounds.length + 1} recorded.` };
  }

  if (request.tool === 'update_round') {
    const roundNumber = typeof input.round_number === 'number' ? input.round_number : 0;
    const round = game.rounds.find((candidate) => candidate.number === roundNumber);
    if (!round) return { success: false, message: `Round ${roundNumber} not found.` };
    const resolvedScores: Record<string, number> = { ...round.scores };
    for (const [name, score] of Object.entries(numberRecordFromUnknown(input.scores))) {
      const player = resolvePlayer(name, game.players);
      if (player) resolvedScores[player.id] = score;
    }
    snapshot.store.updateRound(game.id, round.id, resolvedScores);
    return { success: true, message: `Round ${roundNumber} updated.` };
  }

  if (request.tool === 'undo_last_round') {
    if (game.rounds.length === 0) return { success: false, message: 'No rounds to undo.' };
    snapshot.store.undoLastRound(game.id);
    return { success: true, message: 'Last round removed.' };
  }

  if (request.tool === 'get_leaderboard') {
    const leaderboard = buildLeaderboard(game);
    const summary = leaderboard.map((entry) => `${entry.rank}. ${entry.player.name}: ${entry.total}`).join('\n');
    return { success: true, message: `Current standings:\n${summary}`, data: leaderboard };
  }

  if (request.tool === 'update_player') {
    const target = typeof input.target === 'string' ? input.target : '';
    const player = resolvePlayer(target, game.players);
    if (!player) return { success: false, message: `Player "${target}" not found.` };
    const name = typeof input.name === 'string' ? input.name : undefined;
    const aliases = stringArrayFromUnknown(input.aliases);
    snapshot.store.updatePlayer(game.id, player.id, {
      ...(name ? { name } : {}),
      ...(aliases ? { aliases } : {}),
    });
    return { success: true, message: 'Player updated.' };
  }

  const view = typeof input.view === 'string' ? input.view : '';
  if (!['scoring', 'leaderboard', 'chart', 'table'].includes(view)) {
    return { success: false, message: 'Unknown view.' };
  }
  snapshot.navigate(view, game.id);
  return { success: true, message: `Navigated to ${view}.` };
}

class BrowserLLMTransport implements ChatTransport<UIMessage> {
  private worker: Worker | null = null;
  private mediaPipeWorker: Worker | null = null;

  constructor(private snapshot: BrowserLLMSnapshot) {}

  setSnapshot(snapshot: BrowserLLMSnapshot) {
    this.snapshot = snapshot;
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
    this.mediaPipeWorker?.postMessage({ type: 'dispose' });
    this.mediaPipeWorker?.terminate();
    this.mediaPipeWorker = null;
  }

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('../lib/workers/llm.worker.ts', import.meta.url));
    }
    return this.worker;
  }

  private getMediaPipeWorker(): Worker {
    if (!this.mediaPipeWorker) {
      this.mediaPipeWorker = new Worker(new URL('../lib/workers/mediapipe-llm.worker.ts', import.meta.url));
    }
    return this.mediaPipeWorker;
  }

  private resetMediaPipeWorker(): void {
    this.mediaPipeWorker?.terminate();
    this.mediaPipeWorker = null;
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

  private async loadMediaPipeModel(file: File): Promise<void> {
    const worker = this.getMediaPipeWorker();
    this.snapshot.updateStatus('Loading local MediaPipe model...', 0);

    await new Promise<void>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error('MediaPipe model loading timed out.'));
      }, 180_000);
      const onMessage = (event: MessageEvent<MediaPipeLLMWorkerOutput>) => {
        const message = event.data;
        if (message.type === 'status') {
          this.snapshot.updateStatus(message.message, message.progress);
          return;
        }
        if (message.type === 'ready') {
          cleanup();
          this.snapshot.hideDialog();
          resolve();
          return;
        }
        if (message.type === 'error' && !message.requestId) {
          cleanup();
          this.snapshot.updateStatus('error');
          reject(new Error(message.message));
        }
      };
      const onError = () => {
        cleanup();
        this.snapshot.updateStatus('error');
        reject(new Error('MediaPipe worker failed while loading the model.'));
      };
      const cleanup = () => {
        window.clearTimeout(timeoutId);
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
      };

      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);
      worker.postMessage({ type: 'load', file });
    });
  }

  private async generateWithMediaPipe(
    prompt: string,
    stream: boolean,
    writer?: UIMessageStreamWriter<UIMessage>,
    textPartId?: string,
  ): Promise<string> {
    const worker = this.getMediaPipeWorker();
    const requestId = crypto.randomUUID();
    const outputId = textPartId ?? requestId;

    return new Promise<string>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        this.resetMediaPipeWorker();
        cleanup();
        reject(new Error('MediaPipe generation timed out.'));
      }, 120_000);
      const onAbort = () => {
        worker.postMessage({ type: 'cancel' });
        cleanup();
        reject(new Error('Generation cancelled.'));
      };
      const onMessage = (event: MessageEvent<MediaPipeLLMWorkerOutput>) => {
        const message = event.data;
        if ('requestId' in message && message.requestId !== requestId) return;

        if (message.type === 'delta') {
          writer?.write({ type: 'text-delta', id: outputId, delta: message.text });
          return;
        }

        if (message.type === 'done') {
          cleanup();
          resolve(message.text);
          return;
        }

        if (message.type === 'error') {
          cleanup();
          reject(new Error(message.message));
        }
      };
      const onError = () => {
        cleanup();
        reject(new Error('MediaPipe worker failed during generation.'));
      };
      const cleanup = () => {
        window.clearTimeout(timeoutId);
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
        this.currentAbortSignal?.removeEventListener('abort', onAbort);
      };

      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);
      this.currentAbortSignal?.addEventListener('abort', onAbort, { once: true });
      worker.postMessage({
        type: 'generate',
        requestId,
        prompt,
        stream,
        maxTokens: stream ? MEDIAPIPE_FINAL_RESPONSE_MAX_TOKENS : MEDIAPIPE_TOOL_DECISION_MAX_TOKENS,
      });
    });
  }

  private currentAbortSignal: AbortSignal | undefined;

  private async sendMediaPipeMessages(
    messages: UIMessage[],
    abortSignal: AbortSignal | undefined,
  ): Promise<ReadableStream<UIMessageChunk>> {
    const file = await getRememberedMediaPipeModelFile();
    if (!file) {
      return createUIMessageStream({
        execute: ({ writer }) => {
          const text =
            'Select a local Web-compatible Gemma .litertlm or .task file in Settings before using MediaPipe.';
          const id = crypto.randomUUID();
          writer.write({ type: 'start' });
          writer.write({ type: 'start-step' });
          writer.write({ type: 'text-start', id });
          writer.write({ type: 'text-delta', id, delta: text });
          writer.write({ type: 'text-end', id });
          writer.write({ type: 'finish-step' });
          writer.write({ type: 'finish', finishReason: 'stop' });
        },
      });
    }

    try {
      await this.loadMediaPipeModel(file);
    } catch (err) {
      return createUIMessageStream({
        execute: ({ writer }) => {
          const id = crypto.randomUUID();
          writer.write({ type: 'start' });
          writer.write({ type: 'start-step' });
          writer.write({ type: 'text-start', id });
          writer.write({
            type: 'text-delta',
            id,
            delta: err instanceof Error ? err.message : 'MediaPipe model failed to load.',
          });
          writer.write({ type: 'text-end', id });
          writer.write({ type: 'finish-step' });
          writer.write({ type: 'finish', finishReason: 'error' });
        },
      });
    }
    this.currentAbortSignal = abortSignal;

    return createUIMessageStream({
      execute: async ({ writer }) => {
        const textId = crypto.randomUUID();
        writer.write({ type: 'start' });
        writer.write({ type: 'start-step' });

        const toolResults: MediaPipeToolResult[] = [];
        try {
          for (let step = 0; step < 5; step += 1) {
            const prompt = buildMediaPipePrompt(
              this.snapshot.games,
              this.snapshot.currentGame,
              messages,
              toolResults,
              'tool',
            );
            const decisionText = await this.generateWithMediaPipe(prompt, false);
            const decision = parseMediaPipeToolRequest(decisionText);
            if ('response' in decision) {
              writer.write({ type: 'text-start', id: textId });
              writer.write({ type: 'text-delta', id: textId, delta: decision.response });
              writer.write({ type: 'text-end', id: textId });
              writer.write({ type: 'finish-step' });
              writer.write({ type: 'finish', finishReason: 'stop' });
              return;
            }
            const toolResult = await executeMediaPipeTool(decision, this.snapshot);
            toolResults.push(toolResult);
            if (!toolResult.success) break;
            writer.write({ type: 'text-start', id: textId });
            writer.write({ type: 'text-delta', id: textId, delta: toolResult.message });
            writer.write({ type: 'text-end', id: textId });
            writer.write({ type: 'finish-step' });
            writer.write({ type: 'finish', finishReason: 'stop' });
            return;
          }

          const finalPrompt = buildMediaPipePrompt(
            this.snapshot.games,
            this.snapshot.currentGame,
            messages,
            toolResults,
            'final',
          );
          writer.write({ type: 'text-start', id: textId });
          await this.generateWithMediaPipe(finalPrompt, true, writer, textId);
          writer.write({ type: 'text-end', id: textId });
          writer.write({ type: 'finish-step' });
          writer.write({ type: 'finish', finishReason: 'stop' });
        } catch (err) {
          writer.write({
            type: 'error',
            errorText: err instanceof Error ? err.message : 'MediaPipe generation failed.',
          });
        } finally {
          this.snapshot.hideDialog();
          this.currentAbortSignal = undefined;
        }
      },
    });
  }

  async sendMessages({
    messages,
    abortSignal,
  }: Parameters<ChatTransport<UIMessage>['sendMessages']>[0]): Promise<ReadableStream<UIMessageChunk>> {
    if (this.snapshot.backend === 'mediapipe') {
      return this.sendMediaPipeMessages(messages, abortSignal);
    }

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
        updateStatus('Loading model...', progress);
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
  const llmBackend = useSettingsStore((s) => s.llmBackend);
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

  const navigate = useMemo(
    () => (view: string, gameId?: string) => {
      const targetId = gameId ?? currentGameId;
      if (targetId) {
        router.push(`/game/${targetId}${view === 'scoring' ? '' : `/${view}`}`);
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
      new BrowserLLMTransport({
        backend: llmBackend,
        modelId: llmModel,
        games,
        currentGame,
        tools,
        store,
        navigate,
        showDialog,
        hideDialog,
        updateStatus,
      }),
  );

  useEffect(() => {
    transport.setSnapshot({
      backend: llmBackend,
      modelId: llmModel,
      games,
      currentGame,
      tools,
      store,
      navigate,
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
    navigate,
    showDialog,
    store,
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
