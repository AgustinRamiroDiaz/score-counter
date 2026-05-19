import { FilesetResolver, LlmInference } from '@mediapipe/tasks-genai';

type MediaPipeLLMWorkerInput =
  | { type: 'load'; file: File }
  | { type: 'generate'; requestId: string; prompt: string; stream: boolean; maxTokens: number }
  | { type: 'cancel' }
  | { type: 'dispose' };

type MediaPipeLLMWorkerOutput =
  | { type: 'status'; message: string; progress?: number }
  | { type: 'ready' }
  | { type: 'delta'; requestId: string; text: string }
  | { type: 'done'; requestId: string; text: string }
  | { type: 'error'; requestId?: string; message: string };

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

function post(message: MediaPipeLLMWorkerOutput) {
  if (message.type === 'status' || message.type === 'ready' || message.type === 'error') {
    console.warn(`[mediapipe-worker] ${message.type}: ${'message' in message ? message.message : 'ready'}`);
  }
  self.postMessage(message);
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
    console.warn(`[mediapipe-worker] WebGPU error: ${event.error.message}`);
  });
  device.lost.then((info) => {
    console.warn(`[mediapipe-worker] WebGPU device lost: ${info.reason} ${info.message}`);
  });
  console.warn(
    `[mediapipe-worker] WebGPU adapter ready: shader-f16=${hasShaderF16}, subgroups=${adapter.features.has('subgroups')}`,
  );

  return { device: device as never, adapterInfo: adapter.info as never };
}

async function loadModel(file: File) {
  const nextModelKey = modelKey(file);
  if (llm && loadedModelKey === nextModelKey) {
    post({ type: 'ready' });
    return;
  }

  loadingPromise = (async () => {
    post({ type: 'status', message: 'Loading MediaPipe runtime...', progress: 0.05 });
    llm?.close();
    llm = null;
    loadedModelKey = null;

    const genai = await FilesetResolver.forGenAiTasks(WASM_ROOT);
    post({ type: 'status', message: 'Reading local model...', progress: 0.25 });
    const buffer = new Uint8Array(await file.arrayBuffer());
    post({ type: 'status', message: 'Initializing MediaPipe model...', progress: 0.6 });
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
    post({ type: 'ready' });
  })();

  try {
    await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

self.onmessage = async (event: MessageEvent<MediaPipeLLMWorkerInput>) => {
  const message = event.data;

  try {
    if (message.type === 'load') {
      await loadModel(message.file);
      return;
    }

    if (message.type === 'generate') {
      if (loadingPromise) await loadingPromise;
      if (!llm) {
        post({ type: 'error', requestId: message.requestId, message: 'Select a MediaPipe model file first.' });
        return;
      }

      const prompt = formatGemmaPrompt(message.prompt);
      const tokenCount = llm.sizeInTokens(prompt);
      console.warn(
        `[mediapipe-worker] generate start: ${prompt.length} chars, ${tokenCount ?? 'unknown'} tokens, sessionMaxTokens=${MEDIAPIPE_MAX_TOKENS}, requestedMaxTokens=${message.maxTokens}`,
      );

      let text = '';
      const result = await llm.generateResponse(prompt, (partialResult, done) => {
        const delta = partialResult.startsWith(text) ? partialResult.slice(text.length) : partialResult;
        text = partialResult;
        if (!done && partialResult.length > 0) {
          console.warn(`[mediapipe-worker] generate partial: ${partialResult.length} chars`);
        }
        if (message.stream) {
          post({ type: 'delta', requestId: message.requestId, text: delta });
        }
      });
      console.warn(`[mediapipe-worker] generate done: ${(result || text).length} chars`);
      post({ type: 'done', requestId: message.requestId, text: result || text });
      return;
    }

    if (message.type === 'cancel') {
      llm?.cancelProcessing();
      return;
    }

    llm?.close();
    llm = null;
    loadedModelKey = null;
  } catch (err) {
    post({
      type: 'error',
      requestId: message.type === 'generate' ? message.requestId : undefined,
      message: err instanceof Error ? err.message : 'MediaPipe model failed.',
    });
  }
};

export {};
