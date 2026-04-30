<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Score Counter

## Stack
- Next.js 16 App Router — **all routes are `'use client'`**, no Server Components/Actions/Route Handlers
- TypeScript strict, Tailwind CSS v4, shadcn/ui, Zustand + localStorage
- AI runs in-browser via Transformers.js Web Workers (`lib/workers/`)

## Commands
- `npm run dev` — starts on **port 3456** (not 3000)
- `npm run build` — `next build` with Turbopack
- `npm run lint` — ESLint (strict: no `any`, no `!`, type-imports required)

No test framework configured.

## Architecture
- 100% client-side, zero backend. All data in `localStorage` via Zustand persistence.
- `@/*` → root (e.g. `@/lib/types` → `lib/types.ts`)
- Workers use `new URL()` pattern: `new Worker(new URL('../workers/llm.worker.ts', import.meta.url))`
- `lib/workers/llm.worker.ts` sets `env.allowLocalModels = false` — models fetch from HuggingFace CDN
- Game pages: `app/game/[id]/` with tab-based routing (page, table, chart, leaderboard)

## Conventions
- Every `app/` page/component needs `'use client'` directive
- Components in `components/ui/` are shadcn-generated — regenerate with `npx shadcn add`, don't hand-edit
- ESLint errors on `console.log` (warns only for `console.error`/`console.warn`)
