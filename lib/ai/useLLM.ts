'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useModelDownloadStore } from '@/lib/store/modelDownloadStore';

export interface LLMStatus {
  loading: boolean;
  status: string;
  progress?: number;
}

type BrowserAIWorkerMessage =
  | { status: 'loading'; data?: string; progress?: number }
  | { status: 'ready' }
  | { status: 'error'; data?: string }
  | { status: 'progress'; progress?: number; file?: string };

function progressPercent(progress: number | undefined): number | undefined {
  if (progress === undefined) return undefined;
  return progress <= 1 ? Math.round(progress * 100) : Math.round(progress);
}

export function useLLM() {
  const workerRef = useRef<Worker | null>(null);
  const [llmStatus, setLLMStatus] = useState<LLMStatus>({ loading: false, status: 'idle' });
  const { showDialog, hideDialog, updateStatus } = useModelDownloadStore();

  useEffect(() => {
    const worker = new Worker(new URL('../workers/llm.worker.ts', import.meta.url));
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  const load = useCallback(
    (modelId: string, onDone?: () => void) => {
      const worker = workerRef.current;
      if (!worker) return;

      const startDownload = () => {
        setLLMStatus({ loading: true, status: 'Loading model...', progress: 0 });
        updateStatus('Loading model...', 0);
        worker.postMessage({
          type: 'load',
          data: {
            modelId,
            device: 'auto',
          },
        });
      };

      const cancelDownload = () => {
        worker.postMessage({ type: 'interrupt' });
        hideDialog();
        setLLMStatus({ loading: false, status: 'idle' });
      };

      showDialog({
        modelId,
        modelType: 'llm',
        confirmDownload: startDownload,
        cancelDownload,
      });

      worker.onmessage = (event: MessageEvent<BrowserAIWorkerMessage>) => {
        const message = event.data;

        if (message.status === 'ready') {
          setLLMStatus({ loading: false, status: 'ready' });
          hideDialog();
          onDone?.();
          return;
        }

        if (message.status === 'error') {
          setLLMStatus({ loading: false, status: 'error' });
          updateStatus('error');
          return;
        }

        if (message.status === 'progress') {
          const progress = progressPercent(message.progress);
          const status = message.file ? `Loading ${message.file}` : 'Loading model...';
          setLLMStatus({ loading: true, status, progress });
          updateStatus(status, progress);
          return;
        }

        const status = message.data ?? 'Loading model...';
        setLLMStatus({ loading: true, status, progress: message.progress });
        updateStatus(status, message.progress);
      };
    },
    [hideDialog, showDialog, updateStatus],
  );

  return { load, llmStatus };
}
