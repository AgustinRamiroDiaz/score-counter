'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LLM_MODELS, STT_MODELS } from '@/lib/config/models';

interface SettingsState {
  sttModel: string;
  llmModel: string;
  setSTTModel: (model: string) => void;
  setLLMModel: (model: string) => void;
}

const defaultLLM = LLM_MODELS[0].id;
const defaultSTT = STT_MODELS[0].id;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      sttModel: defaultSTT,
      llmModel: defaultLLM,
      setSTTModel: (sttModel) => set({ sttModel }),
      setLLMModel: (llmModel) => set({ llmModel }),
    }),
    { name: 'score-counter-settings' },
  ),
);
