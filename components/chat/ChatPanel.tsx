'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import type { ChatMessage as ChatMessageType } from '@/lib/types';
import { MessageSquare } from 'lucide-react';

interface Props {
  messages: ChatMessageType[];
  onSend: (text: string) => void;
  isGenerating: boolean;
  gameActive: boolean;
}

export function ChatPanel({ messages, onSend, isGenerating, gameActive }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-3 pt-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm text-center max-w-52">
              {gameActive
                ? 'Ask me to add scores, show the leaderboard, or navigate views.'
                : 'Start a game to use the chat assistant.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-3">
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      <ChatInput
        onSend={onSend}
        disabled={!gameActive || isGenerating}
        placeholder={gameActive ? 'Ask about scores…' : 'No active game'}
      />
    </div>
  );
}
