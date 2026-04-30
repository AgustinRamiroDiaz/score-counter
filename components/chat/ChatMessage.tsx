'use client';

import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/lib/types';

interface Props {
  message: ChatMessageType;
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar dot */}
      <div
        className={cn(
          'h-6 w-6 rounded-full shrink-0 mt-0.5 flex items-center justify-center text-[10px] font-bold',
          isUser
            ? 'bg-primary/20 text-primary'
            : 'bg-ai/20 text-ai',
        )}
      >
        {isUser ? 'You' : 'AI'}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-primary/15 text-foreground rounded-tr-sm border border-primary/20'
            : 'bg-ai/10 text-foreground rounded-tl-sm border border-ai/15',
        )}
      >
        {message.content ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : (
          <span className="flex gap-1 items-center py-0.5">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="w-1.5 h-1.5 rounded-full bg-ai/60 animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
