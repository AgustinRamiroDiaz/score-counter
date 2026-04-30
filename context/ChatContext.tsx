'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useGameStore } from '@/lib/store/gameStore';
import { useLLM } from '@/lib/ai/useLLM';
import { executeTool } from '@/lib/ai/tools';
import type { ToolName, ToolArgs } from '@/lib/ai/tools';
import type { ChatMessage, GameContext, GameSummary } from '@/lib/types';

interface ChatContextValue {
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  isGenerating: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  clearHistory: () => void;
  currentGameId: string | undefined;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesRef = useRef<ChatMessage[]>([]);

  const router = useRouter();
  const pathname = usePathname();
  const games = useGameStore((s) => s.games);
  const addRound = useGameStore((s) => s.addRound);
  const updateRound = useGameStore((s) => s.updateRound);
  const undoLastRound = useGameStore((s) => s.undoLastRound);
  const updatePlayer = useGameStore((s) => s.updatePlayer);
  const createGame = useGameStore((s) => s.createGame);

  const { generate } = useLLM();

  const currentGameId = pathname?.match(/\/game\/([^/]+)/)?.[1];
  const currentGame = currentGameId ? games.find((g) => g.id === currentGameId) : undefined;

  const updateLastAssistant = useCallback((delta: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (!last || last.role !== 'assistant') return prev;
      const updated = [...prev.slice(0, -1), { ...last, content: last.content + delta }];
      messagesRef.current = updated;
      return updated;
    });
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      if (isGenerating || !text.trim()) return;

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

      const allMessages = [...messagesRef.current, userMsg];
      const newMessages = [...allMessages, assistantMsg];
      messagesRef.current = newMessages;
      setMessages(newMessages);
      setIsGenerating(true);

      const availableGames: GameSummary[] = games.map((g) => ({
        id: g.id,
        name: g.name,
        playerCount: g.players.length,
        roundCount: g.rounds.length,
      }));

      const context: GameContext = currentGame
        ? {
            mode: 'game',
            gameName: currentGame.name,
            players: currentGame.players,
            rounds: currentGame.rounds,
            availableGames,
          }
        : { mode: 'home', availableGames };

      generate(allMessages, context, {
        onDelta: updateLastAssistant,

        onToolCall: (toolName, toolArgs) => {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (!last || last.role !== 'assistant') return prev;
            return [...prev.slice(0, -1), { ...last, content: '⚙️ Working…' }];
          });

          const store = {
            addRound,
            updateRound,
            undoLastRound,
            updatePlayer,
            createGame,
          };

          const result = executeTool(
            toolName as ToolName,
            toolArgs as ToolArgs[ToolName],
            currentGame,
            store,
            (view: string, gameId?: string) => {
              const targetId = gameId ?? currentGameId;
              if (targetId) {
                router.push(`/game/${targetId}${view === 'scoring' ? '' : `/${view}`}`);
              } else {
                router.push('/');
              }
            },
          );

          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (!last || last.role !== 'assistant') return prev;
            const updated = [...prev.slice(0, -1), { ...last, content: result.message }];
            messagesRef.current = updated;
            return updated;
          });
        },

        onDone: () => setIsGenerating(false),

        onError: (msg) => {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (!last || last.role !== 'assistant') return prev;
            const updated = [...prev.slice(0, -1), { ...last, content: `Error: ${msg}` }];
            messagesRef.current = updated;
            return updated;
          });
          setIsGenerating(false);
        },
      });
    },
    [
      isGenerating,
      games,
      currentGame,
      currentGameId,
      generate,
      updateLastAssistant,
      addRound,
      updateRound,
      undoLastRound,
      updatePlayer,
      createGame,
      router,
    ],
  );

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
        isGenerating,
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen((v) => !v),
        clearHistory: () => {
          setMessages([]);
          messagesRef.current = [];
        },
        currentGameId,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
  return ctx;
}
