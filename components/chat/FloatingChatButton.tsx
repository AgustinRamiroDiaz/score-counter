'use client';

import { usePathname } from 'next/navigation';
import { useChatContext } from '@/context/ChatContext';
import { MessageSquare, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FloatingChatButton() {
  const { toggle, isOpen, isGenerating } = useChatContext();
  const pathname = usePathname();
  const onGamePage = pathname?.includes('/game/');

  return (
    <button
      onClick={toggle}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
      className={cn(
        'fixed z-50 flex items-center justify-center',
        'h-14 w-14 rounded-full shadow-lg transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        onGamePage ? 'bottom-[calc(56px+16px)] right-4' : 'bottom-6 right-4',
        isOpen
          ? 'bg-secondary text-foreground scale-90'
          : 'bg-ai text-ai-foreground hover:scale-105 active:scale-95',
        isGenerating && !isOpen && 'animate-pulse',
      )}
    >
      {isOpen ? (
        <X className="h-5 w-5" />
      ) : (
        <MessageSquare className="h-5 w-5" />
      )}

      {/* Glow ring when generating */}
      {isGenerating && !isOpen && (
        <span className="absolute inset-0 rounded-full bg-ai animate-ping opacity-30" />
      )}
    </button>
  );
}
