import type { LLMWorkerInput, LLMWorkerOutput, ChatMessage, GameContext } from '@/lib/types';
import type { TextGenerationPipeline } from '@huggingface/transformers';
import { pipeline, TextStreamer, env } from '@huggingface/transformers';

env.allowLocalModels = false;

let generator: TextGenerationPipeline | null = null;
let loadedModel = '';

async function loadModel(modelId: string) {
  if (generator && loadedModel === modelId) return;
  const post = (msg: LLMWorkerOutput) => self.postMessage(msg);
  post({ type: 'status', message: 'Downloading model…', progress: 0 });
  generator = (await pipeline('text-generation', modelId, {
    progress_callback: (p: { progress?: number; status?: string }) => {
      post({ type: 'status', message: p.status ?? 'Loading…', progress: p.progress });
    },
  })) as TextGenerationPipeline;
  loadedModel = modelId;
  post({ type: 'status', message: 'Model ready' });
}

const GAME_TOOLS = [
  {
    name: 'add_round',
    description: 'Record scores for ALL players for a new round. Must include every player.',
    parameters: { scores: 'object mapping player name to number, e.g. {"Alice": 10, "Bob": 5}' },
  },
  {
    name: 'update_round',
    description: 'Correct scores for a past round by its round number.',
    parameters: { round_number: 'integer (1-based)', scores: 'object mapping player name to number' },
  },
  {
    name: 'undo_last_round',
    description: 'Remove the most recently recorded round.',
    parameters: {},
  },
  {
    name: 'get_leaderboard',
    description: 'Return the current standings sorted by total score.',
    parameters: {},
  },
  {
    name: 'update_player',
    description: 'Rename a player or update their aliases.',
    parameters: { target: 'current player name or alias', name: 'optional new name', aliases: 'optional string array of aliases' },
  },
  {
    name: 'navigate',
    description: 'Switch to a different view (scoring, leaderboard, chart, or table).',
    parameters: { view: 'one of: scoring, leaderboard, chart, table' },
  },
];

const CREATE_GAME_TOOL = {
  name: 'create_game',
  description: 'Create a new game with a list of players.',
  parameters: {
    name: 'string — the game name',
    players: 'array of objects: [{ "name": "Alice", "aliases": ["Al"] }, ...]  — at least 2 required',
  },
};

function buildSystemPrompt(ctx: GameContext): string {
  const toolInstruction = `When you need to call a tool, respond ONLY with valid JSON in this exact format and nothing else:
{"tool": "tool_name", "args": {...}}

If no tool is needed, respond conversationally in one or two sentences.`;

  if (ctx.mode === 'home') {
    const gameList =
      ctx.availableGames.length > 0
        ? ctx.availableGames
            .map((g) => `- "${g.name}" (${g.playerCount} players, ${g.roundCount} rounds)`)
            .join('\n')
        : '  (none yet)';

    return `You are a friendly score-tracking assistant. You help users create and manage round-based games.

Existing games:
${gameList}

You can create new games. When asked, collect the game name and all player names (at least 2), then call create_game.

${toolInstruction}

Available tools:
${JSON.stringify([CREATE_GAME_TOOL], null, 2)}`;
  }

  // game mode
  const playerList = (ctx.players ?? [])
    .map((p) => `- ${p.name}${p.aliases.length ? ` (aliases: ${p.aliases.join(', ')})` : ''}`)
    .join('\n');

  return `You are a scoring assistant for the game "${ctx.gameName ?? ''}".

Players:
${playerList || '  (none)'}

Rounds played: ${ctx.rounds?.length ?? 0}

${toolInstruction}

IMPORTANT for add_round: you MUST include a score for every player. If any are missing, ask before calling the tool.

Available tools:
${JSON.stringify([...GAME_TOOLS, CREATE_GAME_TOOL], null, 2)}`;
}

function parseToolCall(text: string): { name: string; args: Record<string, unknown> } | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed !== null && typeof parsed === 'object' && 'tool' in parsed) {
      const p = parsed as Record<string, unknown>;
      if (typeof p.tool === 'string') {
        return { name: p.tool, args: (p.args as Record<string, unknown>) ?? {} };
      }
    }
  } catch {
    // not a tool call
  }
  return null;
}

async function generate(messages: ChatMessage[], ctx: GameContext, modelId: string) {
  const post = (msg: LLMWorkerOutput) => self.postMessage(msg);
  await loadModel(modelId);
  if (!generator) throw new Error('Model not loaded');

  const formattedMessages = [
    { role: 'system', content: buildSystemPrompt(ctx) },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  let fullResponse = '';
  const streamer = new TextStreamer(generator.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (text: string) => {
      fullResponse += text;
      post({ type: 'delta', content: text });
    },
  });

  await generator(formattedMessages as Parameters<typeof generator>[0], {
    max_new_tokens: 512,
    temperature: 0.3,
    do_sample: true,
    streamer,
  });

  const toolCall = parseToolCall(fullResponse.trim());
  if (toolCall) {
    post({ type: 'tool_call', name: toolCall.name, args: toolCall.args });
  }
  post({ type: 'done' });
}

self.onmessage = async (e: MessageEvent<LLMWorkerInput & { modelId?: string }>) => {
  if (e.data.type === 'generate') {
    try {
      await generate(
        e.data.messages,
        e.data.gameContext,
        e.data.modelId ?? 'HuggingFaceTB/SmolLM3-3B',
      );
    } catch (err) {
      self.postMessage({ type: 'error', message: String(err) } satisfies LLMWorkerOutput);
    }
  }
};

export {};
