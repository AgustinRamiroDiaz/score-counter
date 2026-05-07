import { chromium, test as base } from '@playwright/test';
import path from 'node:path';
import type { BrowserContext } from '@playwright/test';

const userDataDir = path.join(process.cwd(), '.playwright', 'browser-cache', 'chromium');

export const test = base.extend<{ context: BrowserContext }>({
  context: async ({}, run) => {
    const context = await chromium.launchPersistentContext(userDataDir, {
      viewport: { width: 1280, height: 720 },
    });

    await run(context);
    await context.close();
  },
});

export { expect } from '@playwright/test';
