'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useGameStore } from '@/lib/store/gameStore';
import { Button } from '@/components/ui/button';
import { formatGameDate } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export default function GameLayout({ children }: Props) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <GameLayoutContent>{children}</GameLayoutContent>
    </Suspense>
  );
}

function GameLayoutContent({ children }: Props) {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
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
      <header className="sticky top-0 z-30 flex items-center gap-2 px-2 py-2 bg-background/90 backdrop-blur border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl tracking-wide truncate leading-none">{game.name}</h1>
          <p className="text-xs text-muted-foreground">
            Created {formatGameDate(game.createdAt)} · {game.players.length} players · {game.rounds.length} rounds
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
