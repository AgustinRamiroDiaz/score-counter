'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { LLMWorkerOutput, ChatMessage, GameContext } from '@/lib/types';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { useModelDownloadStore } from '@/lib/store/modelDownloadStore';

export interface LLMStatus {
  loading: boolean;
  status: string;
  progress?: number;
}

export function useLLM() {
  const workerRef = useRef<Worker | null>(null);
  const [llmStatus, setLLMStatus] = useState<LLMStatus>({ loading: false, status: 'idle' });
  const llmModel = useSettingsStore((s) => s.llmModel);
  const { showDialog, hideDialog, updateStatus } = useModelDownloadStore();

  useEffect(() => {
    const worker = new Worker(new URL('../workers/llm.worker.ts', import.meta.url));
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  const generate = useCallback(
    (
      messages: ChatMessage[],
      gameContext: GameContext,
      callbacks: {
        onDelta: (text: string) => void;
        onToolCall: (name: string, args: Record<string, unknown>) => void;
        onDone: () => void;
        onError: (msg: string) => void;
      },
    ) => {
      const worker = workerRef.current;
      if (!worker) return;

      const startDownload = () => {
        worker.postMessage({ type: 'generate', messages, gameContext, modelId: llmModel });
      };

      const cancelDownload = () => {
        worker.postMessage({ type: 'abort' });
        hideDialog();
        setLLMStatus({ loading: false, status: 'idle' });
      };

      showDialog({
        modelId: llmModel,
        modelType: 'llm',
        confirmDownload: startDownload,
        cancelDownload,
      });

      worker.onmessage = (e: MessageEvent<LLMWorkerOutput>) => {
        const msg = e.data;
        if (msg.type === 'delta') {
          callbacks.onDelta(msg.content);
        } else if (msg.type === 'tool_call') {
          callbacks.onToolCall(msg.name, msg.args);
        } else if (msg.type === 'done') {
          setLLMStatus({ loading: false, status: 'ready' });
          hideDialog();
          callbacks.onDone();
        } else if (msg.type === 'status') {
          setLLMStatus({ loading: true, status: msg.message, progress: msg.progress });
          updateStatus(msg.message, msg.progress);
        } else if (msg.type === 'error') {
          setLLMStatus({ loading: false, status: 'error' });
          updateStatus('error');
        }
      };
    },
    [llmModel, showDialog, hideDialog, updateStatus],
  );

  return { generate, llmStatus };
}
