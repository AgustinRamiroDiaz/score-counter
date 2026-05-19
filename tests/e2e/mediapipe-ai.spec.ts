import fs from 'node:fs';
import { expect, test } from './fixtures';

const REQUESTED_GEMMA_MODEL_PATH = '/home/az/Documents/gemma-3-tflite-gemma3-1b-it-int4-v1.task';
const EXTRACTED_GEMMA_MODEL_PATH =
  '/home/az/Documents/gemma-3-tflite-gemma3-1b-it-int4-v1/gemma3-1B-it-int4.task';
const GEMMA_MODEL_PATH =
  process.env.E2E_MEDIAPIPE_MODEL_PATH ??
  (fs.existsSync(REQUESTED_GEMMA_MODEL_PATH)
    ? REQUESTED_GEMMA_MODEL_PATH
    : EXTRACTED_GEMMA_MODEL_PATH);

function formatExpectedGameDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(timestamp));
}

test('MediaPipe chat creates a new game from a prompt', async ({ page }) => {
  test.slow();
  test.skip(
    !fs.existsSync(GEMMA_MODEL_PATH),
    `MediaPipe model file not found at ${GEMMA_MODEL_PATH}`,
  );
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      console.warn(`[browser:${message.type()}] ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    console.warn(`[browser:pageerror] ${error.message}`);
  });

  const runId = Date.now().toString(36);
  const gameName = `Match ${runId}`;
  const playerOne = `Ava ${runId}`;
  const playerTwo = `Ben ${runId}`;
  const createdDate = formatExpectedGameDate(Date.now());

  await page.goto('/');
  await page.locator('a[href="/settings"]').click();
  await page.getByLabel('LLM Backend').click();
  await page.getByRole('option', { name: 'MediaPipe' }).click();
  console.warn(`Using MediaPipe model: ${GEMMA_MODEL_PATH}`);
  await page.locator('input[type="file"]').setInputFiles(GEMMA_MODEL_PATH);
  await expect(page.getByText(GEMMA_MODEL_PATH.split('/').at(-1) ?? '.task')).toBeVisible();

  await page.locator('header button').first().click();
  await page.getByRole('button', { name: 'Open chat' }).click();
  await page
    .getByPlaceholder('Ask anything…')
    .fill(`Create a new game called ${gameName} with ${playerOne} and ${playerTwo}`);
  await page.getByRole('button', { name: 'Send' }).click();

  await expect(page.getByTestId('chat-message-content-user')).toContainText(
    'Create a new game',
  );
  await expect(page.getByText(/Thinking|Loading|Ask me anything/)).toBeVisible({ timeout: 15_000 });

  await page.waitForTimeout(5_000);
  console.warn(
    `Assistant snapshots after 5s: ${await page
      .getByTestId('chat-message-content-assistant')
      .allTextContents()
      .then((values) => JSON.stringify(values))}`,
  );

  const assistantResponse = page.getByTestId('chat-message-content-assistant').last();
  await expect
    .poll(async () => (await assistantResponse.textContent())?.trim() ?? '', {
      timeout: 3 * 60 * 1000,
      message: 'Wait for MediaPipe to produce a non-empty assistant response',
    })
    .not.toEqual('');

  const assistantText = (await assistantResponse.textContent()) ?? '';
  if (assistantText.includes('shader-f16')) {
    test.skip(true, 'Current WebGPU adapter does not expose shader-f16, so MediaPipe cannot decode on this host.');
  }

  await expect(page).toHaveURL(/\/game\/[^/]+$/);
  await page.getByRole('button', { name: 'Close chat' }).click();
  await expect(page.getByRole('heading', { name: gameName })).toBeVisible();
  await expect(page.getByText(`Created ${createdDate} · 2 players · 0 rounds`)).toBeVisible();
  await expect(page.getByText(playerOne, { exact: true })).toBeVisible();
  await expect(page.getByText(playerTwo, { exact: true })).toBeVisible();

  await page.locator('header button').first().click();
  await expect(page.getByText('Your Games')).toBeVisible();
  const gameCard = page.locator('.group').filter({ hasText: gameName }).filter({ hasText: createdDate });
  await expect(gameCard).toContainText('2 players · 0 rounds');
  await gameCard.click();

  await expect(page.getByRole('heading', { name: gameName })).toBeVisible();
  await expect(page.getByText(playerOne, { exact: true })).toBeVisible();
  await expect(page.getByText(playerTwo, { exact: true })).toBeVisible();
});
