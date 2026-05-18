# Score Counter

A client-only Next.js score tracking app with an in-browser AI chat assistant.

## Development

```bash
npm install
npm run dev
```

The dev server runs on port `3456`:

```text
http://localhost:3456
```

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## E2E Tests

Playwright E2E tests live in `tests/e2e`.

Run all E2E tests:

```bash
npm run test:e2e
```

Run only the AI chat test:

```bash
npm run test:e2e -- tests/e2e/chat-ai.spec.ts --timeout=900000
```

The AI chat test opens the global chat, clicks `What can you do?`, waits for the local Transformers.js model to answer, and asserts that the assistant produced a non-empty response.

## Browser Model Cache

The AI E2E test uses a real LLM through Browser AI, Transformers.js, and the Vercel AI SDK. The first run may download and initialize the test model:

```text
HuggingFaceTB/SmolLM2-135M-Instruct
```

To avoid downloading the model every run, the Playwright fixture uses a persistent Chromium profile:

```text
.playwright/browser-cache/chromium
```

That profile stores browser Cache Storage, IndexedDB, localStorage, and other browser data used by Transformers.js. It is intentionally ignored by git.

Caveats:

- The first run can be slow because it downloads model files from Hugging Face and warms up the model.
- Later runs should be much faster as long as `.playwright/browser-cache/chromium` remains in place.
- Deleting `.playwright` clears the browser model cache and forces a fresh download.
- The AI E2E test is stateful at the browser-profile level, but it resets the app's local game data and test model setting before running.
- CI should cache `.playwright/browser-cache/chromium` if model download time is a concern.
- If Playwright browser binaries are missing, install them with:

```bash
npx playwright install chromium
```
