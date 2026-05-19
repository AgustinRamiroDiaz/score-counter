'use client';

import { FilesetResolver, LlmInference } from '@mediapipe/tasks-genai';

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@0.10.27/wasm';
const MEDIAPIPE_MAX_TOKENS = 2048;

let llm: LlmInference | null = null;
let loadedModelKey: string | null = null;
let loadingPromise: Promise<void> | null = null;

type StableGPUFeatureName = 'shader-f16';

interface StableGPUAdapter {
  features: { has: (feature: string) => boolean };
  info: unknown;
  limits: {
    maxBufferSize: number;
    maxStorageBufferBindingSize: number;
    maxStorageBuffersPerShaderStage: number;
  };
  requestDevice: (descriptor: {
    requiredFeatures: StableGPUFeatureName[];
    requiredLimits: StableGPUAdapter['limits'];
  }) => Promise<StableGPUDevice>;
}

interface StableGPUDevice {
  addEventListener: (
    type: 'uncapturederror',
    listener: (event: { error: { message: string } }) => void,
  ) => void;
  lost: Promise<{ reason: string; message: string }>;
}

function modelKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function formatGemmaPrompt(prompt: string): string {
  return `<start_of_turn>user\n${prompt}<end_of_turn>\n<start_of_turn>model\n`;
}

async function createStableWebGpuOptions() {
  const gpu = navigator.gpu as
    | { requestAdapter: (options: { powerPreference: 'high-performance' }) => Promise<StableGPUAdapter | null> }
    | undefined;
  if (!gpu) throw new Error('WebGPU is not available in this browser.');
  const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('Unable to request a WebGPU adapter.');

  const requiredFeatures: StableGPUFeatureName[] = [];
  const hasShaderF16 = adapter.features.has('shader-f16');
  if (!hasShaderF16) {
    throw new Error(
      'MediaPipe LLM is not available because this browser WebGPU adapter does not expose shader-f16. Try a browser/GPU driver combination with shader-f16 support.',
    );
  }
  if (hasShaderF16) {
    requiredFeatures.push('shader-f16');
  }

  const device = await adapter.requestDevice({
    requiredFeatures,
    requiredLimits: {
      maxBufferSize: adapter.limits.maxBufferSize,
      maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
      maxStorageBuffersPerShaderStage: adapter.limits.maxStorageBuffersPerShaderStage,
    },
  });
  device.addEventListener('uncapturederror', (event) => {
    console.warn(`[mediapipe-main] WebGPU error: ${event.error.message}`);
  });
  device.lost.then((info) => {
    console.warn(`[mediapipe-main] WebGPU device lost: ${info.reason} ${info.message}`);
  });
  console.warn(
    `[mediapipe-main] WebGPU adapter ready: shader-f16=${hasShaderF16}, subgroups=${adapter.features.has('subgroups')}`,
  );

  return { device: device as never, adapterInfo: adapter.info as never };
}

export async function loadMediaPipeLLM(
  file: File,
  onStatus: (status: string, progress?: number) => void,
): Promise<void> {
  const nextModelKey = modelKey(file);
  if (llm && loadedModelKey === nextModelKey) return;

  loadingPromise = (async () => {
    onStatus('Loading MediaPipe runtime...', 0.05);
    llm?.close();
    llm = null;
    loadedModelKey = null;

    const genai = await FilesetResolver.forGenAiTasks(WASM_ROOT);
    onStatus('Reading local model...', 0.25);
    const buffer = new Uint8Array(await file.arrayBuffer());
    onStatus('Initializing MediaPipe model...', 0.6);
    const gpuOptions = await createStableWebGpuOptions();

    llm = await LlmInference.createFromOptions(genai, {
      baseOptions: {
        gpuOptions,
        modelAssetBuffer: buffer,
      },
      maxTokens: MEDIAPIPE_MAX_TOKENS,
      topK: 40,
      temperature: 0.3,
      randomSeed: 101,
      forceF32: true,
    });
    loadedModelKey = nextModelKey;
  })();

  try {
    await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

export async function generateMediaPipeResponse(
  prompt: string,
  onDelta?: (delta: string) => void,
): Promise<string> {
  if (loadingPromise) await loadingPromise;
  if (!llm) throw new Error('Select a MediaPipe model file first.');

  const gemmaPrompt = formatGemmaPrompt(prompt);
  const tokenCount = llm.sizeInTokens(gemmaPrompt);
  console.warn(
    `[mediapipe-main] generate start: ${gemmaPrompt.length} chars, ${tokenCount ?? 'unknown'} tokens, sessionMaxTokens=${MEDIAPIPE_MAX_TOKENS}`,
  );
  let lastText = '';
  const result = await llm.generateResponse(gemmaPrompt, (partialResult, done) => {
    const delta = partialResult.startsWith(lastText)
      ? partialResult.slice(lastText.length)
      : partialResult;
    lastText = partialResult;
    if (!done && partialResult.length > 0) {
      console.warn(`[mediapipe-main] generate partial: ${partialResult.length} chars`);
    }
    onDelta?.(delta);
  });
  console.warn(`[mediapipe-main] generate done: ${result.length} chars`);
  return result;
}

export function cancelMediaPipeGeneration(): void {
  llm?.cancelProcessing();
}

export function disposeMediaPipeLLM(): void {
  llm?.close();
  llm = null;
  loadedModelKey = null;
  loadingPromise = null;
}
