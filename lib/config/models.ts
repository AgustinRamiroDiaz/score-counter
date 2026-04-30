export interface ModelPreset {
  id: string;
  label: string;
  description: string;
  size: string;
  sizeBytes: number;
}

export const LLM_MODELS: ModelPreset[] = [
  {
    id: 'HuggingFaceTB/SmolLM3-3B-ONNX',
    label: 'SmolLM3 3B',
    description: 'Best quality for chat & tool use. Requires 4+ GB RAM.',
    size: '~3.2 GB',
    sizeBytes: 3_200_000_000,
  },
  {
    id: 'HuggingFaceTB/SmolLM2-1.7B-ONNX',
    label: 'SmolLM2 1.7B',
    description: 'Good balance of quality and speed. Requires 2.5+ GB RAM.',
    size: '~1.8 GB',
    sizeBytes: 1_800_000_000,
  },
    {
    id: 'onnx-community/Qwen3.5-0.6B-Instruct-onnx',
    label: 'Qwen3.5 0.6B',
    description: 'Alibaba\'s tiny model. Fast, ~1.1 GB download.',
    size: '~1.1 GB',
    sizeBytes: 1_100_000_000,
  },
  {
    id: 'onnx-community/Qwen2.5-1.5B-Instruct-onnx',
    label: 'Qwen2.5 1.5B',
    description: 'Alibaba\'s small model. Good multilingual support.',
    size: '~1.6 GB',
    sizeBytes: 1_600_000_000,
  },
  {
    id: 'onnx-community/Phi-3-mini-4k-instruct-onnx',
    label: 'Phi-3 Mini',
    description: 'Microsoft\'s compact model. Fast, decent quality.',
    size: '~2.3 GB',
    sizeBytes: 2_300_000_000,
  },
];

export const STT_MODELS: ModelPreset[] = [
  {
    id: 'openai/whisper-base',
    label: 'Whisper Base',
    description: 'Good accuracy, moderate size.',
    size: '~140 MB',
    sizeBytes: 140_000_000,
  },
  {
    id: 'openai/whisper-small',
    label: 'Whisper Small',
    description: 'Better accuracy, larger download.',
    size: '~460 MB',
    sizeBytes: 460_000_000,
  },
  {
    id: 'openai/whisper-tiny',
    label: 'Whisper Tiny',
    description: 'Fastest, smallest. Lower accuracy.',
    size: '~75 MB',
    sizeBytes: 75_000_000,
  },
];

export function getModelPreset(id: string, type: 'llm' | 'stt'): ModelPreset | undefined {
  const list = type === 'llm' ? LLM_MODELS : STT_MODELS;
  return list.find((m) => m.id === id);
}
