'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { LLMWorkerOutput, ChatMessage, GameContext } from '@/lib/types';
import { useSettingsStore } from '@/lib/store/settingsStore';

export interface LLMStatus {
  loading: boolean;
  status: string;
  progress?: number;
}

export function useLLM() {
  const workerRef = useRef<Worker | null>(null);
  const [llmStatus, setLLMStatus] = useState<LLMStatus>({ loading: false, status: 'idle' });
  const llmModel = useSettingsStore((s) => s.llmModel);

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

      setLLMStatus({ loading: true, status: 'Generating…' });

      worker.onmessage = (e: MessageEvent<LLMWorkerOutput>) => {
        const msg = e.data;
        if (msg.type === 'delta') {
          callbacks.onDelta(msg.content);
        } else if (msg.type === 'tool_call') {
          callbacks.onToolCall(msg.name, msg.args);
        } else if (msg.type === 'done') {
          setLLMStatus({ loading: false, status: 'ready' });
          callbacks.onDone();
        } else if (msg.type === 'status') {
          setLLMStatus({ loading: true, status: msg.message, progress: msg.progress });
        } else if (msg.type === 'error') {
          setLLMStatus({ loading: false, status: 'error' });
          callbacks.onError(msg.message);
        }
      };

      worker.postMessage({ type: 'generate', messages, gameContext, modelId: llmModel });
    },
    [llmModel],
  );

  return { generate, llmStatus };
}
