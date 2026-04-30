'use client';

import { create } from 'zustand';

interface ModelDownloadState {
  open: boolean;
  modelId: string;
  modelType: 'llm' | 'stt';
  status: string;
  progress?: number;
  confirmDownload: (() => void) | null;
  cancelDownload: (() => void) | null;
  showDialog: (params: {
    modelId: string;
    modelType: 'llm' | 'stt';
    confirmDownload: () => void;
    cancelDownload: () => void;
  }) => void;
  hideDialog: () => void;
  updateStatus: (status: string, progress?: number) => void;
}

export const useModelDownloadStore = create<ModelDownloadState>()((set) => ({
  open: false,
  modelId: '',
  modelType: 'llm',
  status: 'idle',
  progress: undefined,
  confirmDownload: null,
  cancelDownload: null,
  showDialog: ({ modelId, modelType, confirmDownload, cancelDownload }) =>
    set({ open: true, modelId, modelType, status: 'idle', progress: undefined, confirmDownload, cancelDownload }),
  hideDialog: () =>
    set({ open: false, status: 'idle', progress: undefined, confirmDownload: null, cancelDownload: null }),
  updateStatus: (status, progress) => set({ status, progress }),
}));
