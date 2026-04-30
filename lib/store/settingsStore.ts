'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  sttModel: string;
  llmModel: string;
  setSTTModel: (model: string) => void;
  setLLMModel: (model: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      sttModel: 'openai/whisper-base',
      llmModel: 'HuggingFaceTB/SmolLM3-3B-ONNX',
      setSTTModel: (sttModel) => set({ sttModel }),
      setLLMModel: (llmModel) => set({ llmModel }),
    }),
    { name: 'score-counter-settings' },
  ),
);
