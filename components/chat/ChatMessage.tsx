'use client';

import { cn } from '@/lib/utils';
import type { UIMessage } from '@ai-sdk/react';
import { isToolUIPart } from 'ai';

interface Props {
  message: UIMessage;
}

function messageFromToolOutput(output: unknown): string | null {
  if (typeof output === 'string') return output;
  if (output && typeof output === 'object' && 'message' in output) {
    const message = output.message;
    return typeof message === 'string' ? message : null;
  }
  return null;
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';

  const textContent = message.parts
    .filter((part) => part.type === 'text')
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('');
  const toolContent = message.parts
    .filter(isToolUIPart)
    .map((part) => {
      if (part.state === 'output-available') {
        return messageFromToolOutput(part.output);
      }
      if (part.state === 'output-error') {
        return part.errorText;
      }
      return null;
    })
    .filter((part): part is string => part !== null)
    .join('\n');
  const content = textContent || toolContent;

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

      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-primary/15 text-foreground rounded-tr-sm border border-primary/20'
            : 'bg-ai/10 text-foreground rounded-tl-sm border border-ai/15',
        )}
      >
        {content ? (
          <span className="whitespace-pre-wrap">{content}</span>
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
