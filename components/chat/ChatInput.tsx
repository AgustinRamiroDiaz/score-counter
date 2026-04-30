'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MicButton } from './MicButton';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder = 'Ask anything…' }: Props) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
    inputRef.current?.focus();
  };

  return (
    <div className="flex items-center gap-2 p-3 border-t border-border bg-card/80 backdrop-blur shrink-0">
      <MicButton
        onTranscript={(text) => {
          setValue((v) => (v ? `${v} ${text}` : text));
          inputRef.current?.focus();
        }}
        disabled={disabled}
      />
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 h-10 bg-secondary border-transparent focus-visible:border-ai/50 focus-visible:ring-ai/30 text-sm"
      />
      <Button
        size="icon"
        onClick={submit}
        disabled={disabled || !value.trim()}
        className={cn(
          'h-10 w-10 shrink-0 rounded-xl transition-all',
          value.trim() ? 'bg-ai text-ai-foreground hover:bg-ai/90' : 'bg-secondary text-muted-foreground',
        )}
        aria-label="Send"
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
    </div>
  );
}
