'use client';

import { useState } from 'react';
import { useGame } from '@/hooks/useGame';
import { useGameStore } from '@/lib/store/gameStore';
import { RoundSheet } from '@/components/game/RoundSheet';
import { cn } from '@/lib/utils';
import type { Round } from '@/lib/types';

interface Props {
  gameId: string;
}

export function PointsTable({ gameId }: Props) {
  const { game, totalByPlayer } = useGame(gameId);
  const updateRound = useGameStore((s) => s.updateRound);
  const [editingRound, setEditingRound] = useState<Round | null>(null);

  if (!game) return null;

  if (game.rounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-5xl mb-4">📋</p>
        <p className="text-sm">No rounds recorded yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card px-3 py-2.5 text-left font-semibold whitespace-nowrap border-r border-border text-muted-foreground text-xs uppercase tracking-wider">
                Player
              </th>
              {game.rounds.map((r) => (
                <th
                  key={r.id}
                  className="px-3 py-2.5 text-center font-medium text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground hover:bg-white/5 transition-colors text-xs uppercase tracking-wider"
                  onClick={() => setEditingRound(r)}
                >
                  R{r.number}
                </th>
              ))}
              <th className="sticky right-0 z-10 bg-card px-3 py-2.5 text-center font-bold whitespace-nowrap border-l border-border text-primary text-xs uppercase tracking-wider">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {game.players.map((player, i) => {
              const total = totalByPlayer(player.id);
              return (
                <tr
                  key={player.id}
                  className={cn('border-t border-border', i % 2 === 0 ? 'bg-card' : 'bg-white/[0.02]')}
                >
                  <td className="sticky left-0 z-10 backdrop-blur px-3 py-3 font-semibold whitespace-nowrap border-r border-border bg-inherit">
                    {player.name}
                  </td>
                  {game.rounds.map((r) => {
                    const score = r.scores[player.id] ?? 0;
                    return (
                      <td
                        key={r.id}
                        className={cn(
                          'px-3 py-3 text-center tabular-nums cursor-pointer hover:bg-white/5 transition-colors',
                          score > 0 && 'text-primary/80',
                          score < 0 && 'text-destructive',
                        )}
                        onClick={() => setEditingRound(r)}
                      >
                        {score > 0 ? `+${score}` : score}
                      </td>
                    );
                  })}
                  <td className="sticky right-0 z-10 backdrop-blur px-3 py-3 text-center font-display text-xl text-primary tabular-nums border-l border-border bg-inherit">
                    {total}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingRound && (
        <RoundSheet
          key={editingRound.id}
          open={!!editingRound}
          onOpenChange={(open) => !open && setEditingRound(null)}
          players={game.players}
          roundNumber={editingRound.number}
          existingRound={editingRound}
          onConfirm={(scores) => {
            updateRound(gameId, editingRound.id, scores);
            setEditingRound(null);
          }}
        />
      )}
    </>
  );
}
