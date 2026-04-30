'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MicButton } from './MicButton';
import { SendHorizontal } from 'lucide-react';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder = 'Message…' }: Props) {
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
    <div className="flex items-center gap-2 p-2 border-t bg-background">
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
        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submit()}
        placeholder={placeholder}
        disabled={disabled}
        className="h-11 flex-1"
      />
      <Button
        size="icon"
        className="h-11 w-11 shrink-0"
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
      >
        <SendHorizontal className="h-4 w-4" />
      </Button>
    </div>
  );
}
