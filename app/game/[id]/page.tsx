'use client';

import { use, useState } from 'react';
import { useGameStore } from '@/lib/store/gameStore';
import { useGame } from '@/hooks/useGame';
import { RoundSheet } from '@/components/game/RoundSheet';
import { Button } from '@/components/ui/button';
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
    <div className="flex flex-col pb-6">
      {/* Scoreboard */}
      <div className="px-4 pt-4 pb-2 flex flex-col gap-2">
        {leaderboard.map((entry, i) => {
          const lastScore = game.rounds.length > 0
            ? (game.rounds[game.rounds.length - 1].scores[entry.player.id] ?? 0)
            : null;
          return (
            <div
              key={entry.player.id}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-2xl border border-border bg-card',
                i === 0 && game.rounds.length > 0 && 'border-primary/30 bg-primary/5',
              )}
            >
              <span className="font-display text-2xl text-muted-foreground w-6 shrink-0">
                {entry.rank}
              </span>
              <div className="h-10 w-10 rounded-full bg-secondary border border-border shrink-0 flex items-center justify-center text-xs font-bold">
                {entry.player.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{entry.player.name}</p>
                {lastScore !== null && (
                  <p className="text-xs text-muted-foreground">
                    Last: <span className={cn(
                      'font-medium',
                      lastScore > 0 && 'text-primary/80',
                      lastScore < 0 && 'text-destructive',
                    )}>{lastScore > 0 ? `+${lastScore}` : lastScore}</span>
                  </p>
                )}
              </div>
              <span className="font-display text-3xl text-primary tabular-nums">
                {totalByPlayer(entry.player.id)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Recent rounds */}
      {game.rounds.length > 0 && (
        <div className="px-4 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Recent rounds
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground h-7 text-xs"
              onClick={() => undoLastRound(id)}
            >
              <Undo2 className="h-3 w-3" />
              Undo last
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {[...game.rounds].reverse().slice(0, 5).map((round) => (
              <div key={round.id} className="rounded-xl border border-border bg-card px-3 py-2.5">
                <p className="text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                  Round {round.number}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                  {game.players.map((p) => {
                    const score = round.scores[p.id] ?? 0;
                    return (
                      <span key={p.id} className="text-sm">
                        <span className="text-muted-foreground">{p.name}: </span>
                        <span className={cn(
                          'font-semibold tabular-nums',
                          score > 0 && 'text-primary/90',
                          score < 0 && 'text-destructive',
                        )}>
                          {score > 0 ? `+${score}` : score}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAB */}
      <Button
        className="fixed bottom-[72px] left-4 h-14 w-14 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
        size="icon"
        onClick={() => setSheetOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <RoundSheet
        key={sheetOpen ? 'open' : 'closed'}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        players={game.players}
        roundNumber={nextRoundNumber}
        onConfirm={(scores) => addRound(id, scores)}
      />
    </div>
  );
}
