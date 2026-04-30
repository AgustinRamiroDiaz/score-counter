'use client';

import { use } from 'react';
import { useGame } from '@/hooks/useGame';
import { useLocalChat } from '@/hooks/useLocalChat';
import { ChatPanel } from '@/components/chat/ChatPanel';

interface Props {
  params: Promise<{ id: string }>;
}

export default function ChatPage({ params }: Props) {
  const { id } = use(params);
  const { game } = useGame(id);
  const { messages, sendMessage, isGenerating } = useLocalChat(game);

  return (
    <div className="flex flex-col h-[calc(100dvh-56px-57px)]">
      <ChatPanel
        messages={messages}
        onSend={sendMessage}
        isGenerating={isGenerating}
        gameActive={!!game}
      />
    </div>
  );
}
