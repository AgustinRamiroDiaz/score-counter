'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { STTWorkerOutput } from '@/lib/types';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { useModelDownloadStore } from '@/lib/store/modelDownloadStore';
import { isModelCached } from '@/lib/config/models';

export interface STTStatus {
  loading: boolean;
  status: string;
  progress?: number;
}

export function useSTT() {
  const workerRef = useRef<Worker | null>(null);
  const [sttStatus, setSTTStatus] = useState<STTStatus>({ loading: false, status: 'idle' });
  const sttModel = useSettingsStore((s) => s.sttModel);
  const { showDialog, hideDialog, updateStatus } = useModelDownloadStore();

  useEffect(() => {
    const worker = new Worker(new URL('../workers/stt.worker.ts', import.meta.url));
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  const transcribe = useCallback(
    async (
      audio: Float32Array,
      sampleRate: number,
      callbacks: {
        onTranscript: (text: string) => void;
        onError: (msg: string) => void;
      },
    ) => {
      const worker = workerRef.current;
      if (!worker) return;

      const startDownload = () => {
        worker.postMessage({ type: 'transcribe', audio, sampleRate, modelId: sttModel });
      };

      const cancelDownload = () => {
        worker.postMessage({ type: 'abort' });
        hideDialog();
        setSTTStatus({ loading: false, status: 'idle' });
      };

      const cached = await isModelCached(sttModel);

      if (cached) {
        startDownload();
      } else {
        showDialog({
          modelId: sttModel,
          modelType: 'stt',
          confirmDownload: startDownload,
          cancelDownload,
        });
      }

      worker.onmessage = (e: MessageEvent<STTWorkerOutput>) => {
        const msg = e.data;
        if (msg.type === 'transcript') {
          setSTTStatus({ loading: false, status: 'ready' });
          hideDialog();
          callbacks.onTranscript(msg.text);
        } else if (msg.type === 'status') {
          setSTTStatus({ loading: true, status: msg.message, progress: msg.progress });
          updateStatus(msg.message, msg.progress);
        } else if (msg.type === 'error') {
          setSTTStatus({ loading: false, status: 'error' });
          updateStatus('error');
        }
      };
    },
    [sttModel, showDialog, hideDialog, updateStatus],
  );

  const load = useCallback(
    (modelId: string, onDone?: () => void) => {
      const worker = workerRef.current;
      if (!worker) return;

      const startDownload = () => {
        worker.postMessage({ type: 'load', modelId });
      };

      const cancelDownload = () => {
        worker.postMessage({ type: 'abort' });
        hideDialog();
        setSTTStatus({ loading: false, status: 'idle' });
      };

      showDialog({
        modelId,
        modelType: 'stt',
        confirmDownload: startDownload,
        cancelDownload,
      });

      worker.onmessage = (e: MessageEvent<STTWorkerOutput>) => {
        const msg = e.data;
        if (msg.type === 'status') {
          setSTTStatus({ loading: true, status: msg.message, progress: msg.progress });
          updateStatus(msg.message, msg.progress);
          if (msg.message === 'STT model ready') {
            setSTTStatus({ loading: false, status: 'ready' });
            hideDialog();
            onDone?.();
          }
        } else if (msg.type === 'error') {
          setSTTStatus({ loading: false, status: 'error' });
          updateStatus('error');
        }
      };
    },
    [showDialog, hideDialog, updateStatus],
  );

  return { transcribe, load, sttStatus };
}
