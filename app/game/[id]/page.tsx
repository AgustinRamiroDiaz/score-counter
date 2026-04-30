'use client';

import { use, useState } from 'react';
import { useGameStore } from '@/lib/store/gameStore';
import { useGame } from '@/hooks/useGame';
import { RoundSheet } from '@/components/game/RoundSheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  params: Promise<{ id: string }>;
}

export default function ScoringPage({ params }: Props) {
  const { id } = use(params);
  const { game, totalByPlayer, leaderboard } = useGame(id);
  const { addRound, undoLastRound } = useGameStore();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!game) return null;

  const nextRoundNumber = game.rounds.length + 1;

  return (
    <div className="flex flex-col gap-0 pb-4">
      {/* Scoreboard summary */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex flex-col gap-2">
          {leaderboard.map((entry) => (
            <div
              key={entry.player.id}
              className="flex items-center gap-3 p-3 rounded-xl border bg-card"
            >
              <span className="w-5 text-sm font-bold text-muted-foreground text-center">
                {entry.rank}
              </span>
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="text-xs font-bold">
                  {entry.player.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{entry.player.name}</p>
                {game.rounds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Last: {game.rounds[game.rounds.length - 1].scores[entry.player.id] ?? 0}
                  </p>
                )}
              </div>
              <span className="text-xl font-bold tabular-nums">
                {totalByPlayer(entry.player.id)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent rounds */}
      {game.rounds.length > 0 && (
        <div className="px-4 pt-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Recent rounds
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground h-8"
              onClick={() => undoLastRound(id)}
            >
              <Undo2 className="h-3.5 w-3.5" />
              Undo
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {[...game.rounds].reverse().slice(0, 5).map((round) => (
              <div key={round.id} className="rounded-lg border bg-card px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-xs h-5">
                    Round {round.number}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                  {game.players.map((p) => (
                    <span key={p.id} className="text-sm">
                      <span className="text-muted-foreground">{p.name}:</span>{' '}
                      <span
                        className={cn(
                          'font-medium tabular-nums',
                          (round.scores[p.id] ?? 0) > 0 && 'text-green-600 dark:text-green-400',
                          (round.scores[p.id] ?? 0) < 0 && 'text-red-500',
                        )}
                      >
                        {round.scores[p.id] ?? 0}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAB */}
      <Button
        className="fixed bottom-[72px] right-4 h-14 w-14 rounded-full shadow-lg gap-2"
        size="icon"
        onClick={() => setSheetOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <RoundSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        players={game.players}
        roundNumber={nextRoundNumber}
        onConfirm={(scores) => addRound(id, scores)}
      />
    </div>
  );
}
