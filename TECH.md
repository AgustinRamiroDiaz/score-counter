# Score Counter — Technical Definition

## Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js 16 (App Router) | All routes are `'use client'`; no Server Components used for app logic |
| Language | TypeScript (strict) | |
| UI components | shadcn/ui | Tailwind CSS v4 already configured |
| State | Zustand + `localStorage` | Lightweight, no boilerplate; persistence via Zustand middleware |
| Charts | Recharts | React-native, SSR-safe with dynamic import |
| AI inference | Transformers.js (`@huggingface/transformers`) | Runs models in a Web Worker; zero server calls |
| AI orchestration | Vercel AI SDK (`ai`) | Provides `useChat`, tool-calling schema, and streaming primitives |
| STT | `openai/whisper-base` (default, configurable) | Loaded via Transformers.js `pipeline('automatic-speech-recognition')` |
| LLM | `HuggingFaceTB/SmolLM3-3B` (default, configurable) | Loaded via Transformers.js `pipeline('text-generation')` with tool-calling |

---

## Architecture

```
Browser
├── Main thread
│   ├── React (Next.js App Router)
│   ├── Zustand store (game state)
│   └── Chat UI (useChat hook)
└── Web Workers
    ├── stt.worker.ts      — Whisper STT pipeline
    └── llm.worker.ts      — SmolLM3 text-generation pipeline
```

The workers communicate via `postMessage`. The main thread sends audio buffers or text prompts; workers return transcripts, tool-call payloads, or text deltas.

Because the app is 100% client-side, the Next.js `app/` directory uses a single `layout.tsx` with `'use client'` propagated through all children. No Server Actions or Route Handlers are needed.

---

## Folder Structure

```
app/
  layout.tsx              # Root layout, providers
  page.tsx                # Home — game list
  game/[id]/
    layout.tsx            # Tab bar + chat drawer shell
    page.tsx              # Scoring (default tab)
    leaderboard/page.tsx
    chart/page.tsx
    table/page.tsx
  settings/page.tsx

components/
  game/
    PlayerForm.tsx
    RoundSheet.tsx        # Bottom sheet for entering round scores
    ScoreCell.tsx
  views/
    Leaderboard.tsx
    RoundChart.tsx
    PointsTable.tsx
  chat/
    ChatDrawer.tsx
    ChatInput.tsx
    ChatMessage.tsx
    MicButton.tsx
  ui/                     # shadcn/ui re-exports + custom primitives

lib/
  store/
    gameStore.ts          # Zustand slice: games, players, rounds, scores
    settingsStore.ts      # Zustand slice: model names, chat history
  ai/
    tools.ts              # Scoring tool definitions (Vercel AI SDK format)
    useLLM.ts             # Hook: sends prompt + tools to llm.worker
    useSTT.ts             # Hook: sends audio to stt.worker
  workers/
    llm.worker.ts
    stt.worker.ts
  types.ts                # Shared TypeScript interfaces

hooks/
  useGame.ts              # Derived selectors from gameStore
  useChat.ts              # Vercel AI SDK useChat wired to local LLM
```

---

## Data Model

```ts
// lib/types.ts

export interface Player {
  id: string;
  name: string;
  aliases: string[];
}

export interface Round {
  id: string;
  number: number;
  scores: Record<Player['id'], number>; // playerId → points
}

export interface Game {
  id: string;
  name: string;
  createdAt: number;
  players: Player[];
  rounds: Round[];
}

export interface AppSettings {
  sttModel: string;          // default: 'openai/whisper-base'
  llmModel: string;          // default: 'HuggingFaceTB/SmolLM3-3B'
}
```

---

## State Management

Two Zustand stores, both with `persist` middleware writing to `localStorage`.

### `gameStore`

```ts
interface GameState {
  games: Game[];
  activeGameId: string | null;

  createGame(name: string, players: Omit<Player, 'id'>[]): void;
  deleteGame(id: string): void;
  setActiveGame(id: string): void;
  addPlayer(gameId: string, player: Omit<Player, 'id'>): void;
  updatePlayer(gameId: string, playerId: string, patch: Partial<Omit<Player, 'id'>>): void;
  removePlayer(gameId: string, playerId: string): void;
  addRound(gameId: string, scores: Record<string, number>): void;
  updateScore(gameId: string, roundId: string, playerId: string, points: number): void;
  undoLastRound(gameId: string): void;
}
```

### `settingsStore`

```ts
interface SettingsState {
  sttModel: string;
  llmModel: string;
  setSTTModel(model: string): void;
  setLLMModel(model: string): void;
}
```

---

## AI Tool Definitions

Tools are defined using the Vercel AI SDK `tool()` helper and executed on the client. The LLM worker returns structured JSON; the main thread dispatches the corresponding Zustand action.

```ts
// lib/ai/tools.ts (illustrative)

const scoringTools = {
  add_score: tool({
    description: 'Add points to a player for the current round',
    parameters: z.object({
      player: z.string().describe('Player name or alias'),
      points: z.number(),
    }),
    execute: async ({ player, points }) => { /* → gameStore.updateScore */ },
  }),

  start_round: tool({
    description: 'Finalize the current round and open a new one',
    parameters: z.object({}),
    execute: async () => { /* → gameStore.addRound */ },
  }),

  undo_last_entry: tool({
    description: 'Remove the most recently added round',
    parameters: z.object({}),
    execute: async () => { /* → gameStore.undoLastRound */ },
  }),

  get_leaderboard: tool({
    description: 'Return current standings sorted by total score',
    parameters: z.object({}),
    execute: async () => { /* derived from gameStore */ },
  }),

  update_player: tool({
    description: 'Rename a player or update their aliases',
    parameters: z.object({
      target: z.string().describe('Current name or alias'),
      name: z.string().optional(),
      aliases: z.array(z.string()).optional(),
    }),
    execute: async ({ target, ...patch }) => { /* → gameStore.updatePlayer */ },
  }),

  navigate: tool({
    description: 'Switch the active view',
    parameters: z.object({
      view: z.enum(['scoring', 'leaderboard', 'chart', 'table']),
    }),
    execute: async ({ view }) => { /* → Next.js router.push */ },
  }),
};
```

Player name resolution (alias → canonical ID) happens inside each tool's `execute` function before dispatching to the store.

---

## AI Worker Communication

### STT Worker (`stt.worker.ts`)

```
Main → Worker:  { type: 'transcribe', audio: Float32Array, sampleRate: number }
Worker → Main:  { type: 'transcript', text: string }
               | { type: 'error', message: string }
```

### LLM Worker (`llm.worker.ts`)

```
Main → Worker:  { type: 'generate', messages: CoreMessage[], tools: ToolSchema[], model: string }
Worker → Main:  { type: 'delta', content: string }               // streaming text
               | { type: 'tool_call', name: string, args: object }
               | { type: 'done' }
               | { type: 'error', message: string }
```

Workers self-initialize the Transformers.js pipeline on first message and reuse it for subsequent calls. Model name comes from `settingsStore` and is passed with each request so model swaps are picked up without restarting the worker.

---

## Chat Integration

`useChat` (Vercel AI SDK) is configured with a custom `fetch`-compatible handler that routes to the LLM worker instead of an HTTP endpoint. This keeps the SDK's streaming and tool-call handling while staying fully offline.

```ts
// hooks/useChat.ts
const { messages, input, handleSubmit } = useChat({
  api: '/api/chat',        // overridden by a custom transport below
  onToolCall: ({ toolCall }) => executeTool(toolCall),
});
```

A thin Next.js Route Handler at `app/api/chat/route.ts` is used only as a typed interface boundary; the actual inference is proxied to the LLM worker via a `ReadableStream`.

---

## Mobile-First Conventions

- Base styles target mobile (≥ 375 px); `md:` breakpoint for tablet+.
- Bottom sheet pattern (`vaul` or shadcn Drawer) for all modal interactions.
- Tab bar pinned to the bottom (not top) for thumb reach.
- FAB (Floating Action Button) for the primary action on each screen.
- Chat drawer slides up from the bottom; collapsed state shows only the input bar.
- All touch targets ≥ 44 × 44 px enforced via Tailwind utility class audit.

---

## Key Dependencies (to install)

```bash
# UI
npx shadcn@latest init
npx shadcn@latest add button input sheet drawer tabs card badge

# State
npm install zustand

# Charts
npm install recharts

# AI
npm install @huggingface/transformers ai zod

# Audio
# Web Audio API is native — no extra package needed
```

---

## Out of Scope (v1)

- User accounts / cloud sync
- Multiplayer / real-time collaboration
- Game templates or rule sets (the app is score-agnostic)
- Export to CSV / PDF (consider for v2)
- PWA / install prompt (consider for v2)
