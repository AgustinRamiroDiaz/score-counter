'use client';

import { createContext, useContext, useState, useMemo } from 'react';
import { useChat } from '@/hooks/useChat';
import type { UIMessage } from '@ai-sdk/react';

interface ChatContextValue {
  messages: UIMessage[];
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
  const [isOpen, setIsOpen] = useState(false);
  const { messages, sendMessage, status, setMessages, currentGameId } = useChat();

  const value = useMemo(
    () => ({
      messages,
      sendMessage: (content: string) => sendMessage({ text: content }),
      isGenerating: status === 'streaming' || status === 'submitted',
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((v) => !v),
      clearHistory: () => setMessages([]),
      currentGameId,
    }),
    [messages, sendMessage, status, isOpen, setMessages, currentGameId],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
  return ctx;
}
