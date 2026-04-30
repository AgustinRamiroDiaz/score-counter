import type { STTWorkerInput, STTWorkerOutput } from '@/lib/types';
import type { AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';
import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let loadedModel = '';

async function loadModel(modelId: string) {
  if (transcriber && loadedModel === modelId) return;
  const post = (msg: STTWorkerOutput) => self.postMessage(msg);
  post({ type: 'status', message: 'Downloading STT model…', progress: 0 });
  transcriber = (await pipeline('automatic-speech-recognition', modelId, {
    progress_callback: (p: { progress?: number; status?: string }) => {
      post({ type: 'status', message: p.status ?? 'Loading…', progress: p.progress });
    },
  })) as AutomaticSpeechRecognitionPipeline;
  loadedModel = modelId;
  post({ type: 'status', message: 'STT model ready' });
}

async function transcribe(audio: Float32Array, sampleRate: number, modelId: string) {
  const post = (msg: STTWorkerOutput) => self.postMessage(msg);
  await loadModel(modelId);
  if (!transcriber) throw new Error('STT model not loaded');

  const result = await transcriber(audio, {
    sampling_rate: sampleRate,
    chunk_length_s: 30,
    stride_length_s: 5,
  });

  const output = Array.isArray(result) ? result[0] : result;
  const text = (output as { text: string }).text;
  post({ type: 'transcript', text: text.trim() });
}

self.onmessage = async (e: MessageEvent<STTWorkerInput & { modelId?: string }>) => {
  const { type } = e.data;
  if (type === 'transcribe') {
    try {
      await transcribe(e.data.audio, e.data.sampleRate, e.data.modelId ?? 'openai/whisper-base');
    } catch (err) {
      self.postMessage({ type: 'error', message: String(err) } satisfies STTWorkerOutput);
    }
  }
};

export {};
