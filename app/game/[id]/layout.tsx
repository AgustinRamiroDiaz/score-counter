'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/lib/store/gameStore';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default function GameLayout({ children, params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const game = useGameStore((s) => s.games.find((g) => g.id === id));

  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-4">
        <p className="text-muted-foreground">Game not found.</p>
        <Button onClick={() => router.push('/')}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center gap-2 px-2 py-2 bg-background/80 backdrop-blur border-b">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-base truncate">{game.name}</h1>
          <p className="text-xs text-muted-foreground">
            {game.players.length} players · {game.rounds.length} rounds
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-[56px]">{children}</main>

      {/* Bottom navigation */}
      <BottomNav gameId={id} />
    </div>
  );
}
