'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { ChatMessage, GameContext } from '@/lib/types';
import { useLLM } from '@/lib/ai/useLLM';
import { executeTool, type ToolName, type ToolArgs } from '@/lib/ai/tools';
import { useGameStore } from '@/lib/store/gameStore';
import type { Game } from '@/lib/types';

export function useLocalChat(game: Game | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const pendingAssistantId = useRef<string | null>(null);
  const router = useRouter();
  const store = useGameStore();
  const { generate, llmStatus } = useLLM();

  const updateLastAssistant = useCallback((delta: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (!last || last.role !== 'assistant') return prev;
      return [...prev.slice(0, -1), { ...last, content: last.content + delta }];
    });
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      if (!game || isGenerating || !text.trim()) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      };

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      pendingAssistantId.current = assistantMsg.id;
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsGenerating(true);

      const context: GameContext = {
        gameName: game.name,
        players: game.players,
        rounds: game.rounds,
      };

      const allMessages = [...messages, userMsg];

      generate(allMessages, context, {
        onDelta: (text) => updateLastAssistant(text),

        onToolCall: (name, args) => {
          // Replace the streaming assistant content with a clean placeholder
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (!last || last.role !== 'assistant') return prev;
            return [...prev.slice(0, -1), { ...last, content: '⚙️ Executing…' }];
          });

          const result = executeTool(
            name as ToolName,
            args as ToolArgs[ToolName],
            game,
            store,
            (view) => router.push(`/game/${game.id}/${view === 'scoring' ? '' : view}`),
          );

          // Update assistant message with result
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (!last || last.role !== 'assistant') return prev;
            return [
              ...prev.slice(0, -1),
              { ...last, content: result.message },
            ];
          });
        },

        onDone: () => {
          setIsGenerating(false);
          pendingAssistantId.current = null;
        },

        onError: (msg) => {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (!last || last.role !== 'assistant') return prev;
            return [...prev.slice(0, -1), { ...last, content: `Error: ${msg}` }];
          });
          setIsGenerating(false);
        },
      });
    },
    [game, isGenerating, messages, generate, updateLastAssistant, store, router],
  );

  const clearHistory = useCallback(() => setMessages([]), []);

  return { messages, sendMessage, isGenerating, llmStatus, clearHistory };
}
