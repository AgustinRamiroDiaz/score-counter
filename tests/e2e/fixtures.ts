import { chromium, test as base } from '@playwright/test';
import path from 'node:path';
import type { BrowserContext } from '@playwright/test';

export const test = base.extend<{ context: BrowserContext }>({
  context: async ({}, run, testInfo) => {
    const userDataDir = path.join(
      process.cwd(),
      '.playwright',
      'browser-cache',
      `chromium-${testInfo.workerIndex}-${Date.now()}`,
    );
    const context = await chromium.launchPersistentContext(userDataDir, {
      args: ['--enable-unsafe-webgpu'],
      headless: process.env.E2E_HEADLESS !== 'false',
      viewport: { width: 1280, height: 720 },
    });

    await run(context);
    await context.close();
  },
});

export { expect } from '@playwright/test';
