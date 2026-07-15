'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LLM_MODELS, STT_MODELS } from '@/lib/config/models';
import type { LLMBackend } from '@/lib/types';

interface SettingsState {
  sttModel: string;
  llmModel: string;
  llmBackend: LLMBackend;
  ollamaUrl: string;
  ollamaModel: string;
  setSTTModel: (model: string) => void;
  setLLMModel: (model: string) => void;
  setLLMBackend: (backend: LLMBackend) => void;
  setOllamaUrl: (url: string) => void;
  setOllamaModel: (model: string) => void;
}

const defaultLLM = LLM_MODELS[0].id;
const defaultSTT = STT_MODELS[0].id;
const defaultOllamaUrl = 'http://localhost:11434';
const defaultOllamaModel = 'llama3.2';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      sttModel: defaultSTT,
      llmModel: defaultLLM,
      llmBackend: 'transformers',
      ollamaUrl: defaultOllamaUrl,
      ollamaModel: defaultOllamaModel,
      setSTTModel: (sttModel) => set({ sttModel }),
      setLLMModel: (llmModel) => set({ llmModel }),
      setLLMBackend: (llmBackend) => set({ llmBackend }),
      setOllamaUrl: (ollamaUrl) => set({ ollamaUrl }),
      setOllamaModel: (ollamaModel) => set({ ollamaModel }),
    }),
    { name: 'score-counter-settings' },
  ),
);
