import { expect, test } from "./fixtures";

const E2E_LLM_MODEL = "HuggingFaceTB/SmolLM2-135M-Instruct";

test('chat answers the "What can you do?" prompt', async ({ page }) => {
  test.slow();

  await page.addInitScript((modelId) => {
    window.localStorage.setItem(
      "score-counter-settings",
      JSON.stringify({
        state: {
          llmModel: modelId,
          sttModel: "openai/whisper-tiny",
        },
        version: 0,
      }),
    );
    window.localStorage.removeItem("score-counter-games");
  }, E2E_LLM_MODEL);

  await page.goto("/");
  await page.getByRole("button", { name: "Open chat" }).click();
  await page
    .getByRole("button", { name: "What can you do?" })
    .evaluate((button) => {
      if (button instanceof HTMLElement) button.click();
    });

  const downloadDialog = page.getByRole("dialog", { name: "Download Model" });
  if (
    await downloadDialog
      .waitFor({ state: "visible", timeout: 10_000 })
      .then(() => true)
      .catch(() => false)
  ) {
    await downloadDialog.getByRole("button", { name: "Download" }).click();
  }

  await expect(page.getByTestId("chat-message-content-user")).toContainText(
    "What can you do?",
  );

  const assistantResponse = page
    .getByTestId("chat-message-content-assistant")
    .last();
  await expect
    .poll(async () => (await assistantResponse.textContent())?.trim() ?? "", {
      timeout: 10 * 60 * 1000,
      message:
        "Wait for the local AI model to produce a non-empty chat response",
    })
    .not.toEqual("");
});
