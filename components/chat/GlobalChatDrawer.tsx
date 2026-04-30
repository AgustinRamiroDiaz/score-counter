'use client';

import { useEffect, useRef } from 'react';
import { useChatContext } from '@/context/ChatContext';
import { useGameStore } from '@/lib/store/gameStore';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const HOME_CHIPS = ['Create a new game 🎲', 'What can you do?'];
const GAME_CHIPS_NEW = ['Score the first round ✏️', "Who's playing?"];
const GAME_CHIPS = ['Score a round ✏️', "Who's winning? 🏆", 'Undo last round ↩️'];

export function GlobalChatDrawer() {
  const { messages, sendMessage, isGenerating, isOpen, close, clearHistory, currentGameId } =
    useChatContext();
  const games = useGameStore((s) => s.games);
  const bottomRef = useRef<HTMLDivElement>(null);

  const currentGame = currentGameId ? games.find((g) => g.id === currentGameId) : undefined;
  const chips =
    messages.length > 0
      ? []
      : currentGame
        ? currentGame.rounds.length > 0
          ? GAME_CHIPS
          : GAME_CHIPS_NEW
        : HOME_CHIPS;

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, close]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={close}
        aria-hidden
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-label="AI Chat"
        className={cn(
          'chat-drawer fixed inset-x-0 bottom-0 z-50 flex flex-col',
          'max-h-[88dvh] h-[88dvh] max-w-lg mx-auto',
          'bg-card border-t border-x border-border rounded-t-2xl overflow-hidden',
          isOpen ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        {/* Handle + header */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-2 border-b border-border shrink-0">
          <div className="w-10 h-1 bg-border rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
          <div className="h-7 w-7 rounded-full bg-ai/15 flex items-center justify-center shrink-0 mt-1">
            <MessageSquare className="h-3.5 w-3.5 text-ai" />
          </div>
          <div className="flex-1 mt-1 min-w-0">
            <p className="text-sm font-semibold leading-none">
              {currentGame ? currentGame.name : 'Score Assistant'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isGenerating ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  Thinking…
                </span>
              ) : (
                'Ask me anything'
              )}
            </p>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground mt-1 shrink-0"
              onClick={clearHistory}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 pt-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
              <div className="h-14 w-14 rounded-2xl bg-ai/10 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-ai" />
              </div>
              <div>
                <p className="font-semibold text-sm">
                  {currentGame ? `Scoring ${currentGame.name}` : 'Game Assistant'}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-56">
                  {currentGame
                    ? 'Score rounds, check standings, or make changes by chatting.'
                    : 'Create a new game or ask me what I can do.'}
                </p>
              </div>
              {chips.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-1">
                  {chips.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => sendMessage(chip)}
                      className="px-3 py-1.5 rounded-full text-xs bg-secondary hover:bg-accent border border-border transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
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

        {/* Input */}
        <ChatInput onSend={sendMessage} disabled={isGenerating} />
      </div>
    </>
  );
}
