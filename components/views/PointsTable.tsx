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
        <p className="text-4xl mb-3">📋</p>
        <p className="text-sm">No rounds recorded yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 z-10 bg-muted/80 backdrop-blur px-3 py-2 text-left font-semibold whitespace-nowrap border-r">
                Player
              </th>
              {game.rounds.map((r) => (
                <th
                  key={r.id}
                  className="px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => setEditingRound(r)}
                >
                  R{r.number}
                </th>
              ))}
              <th className="sticky right-0 z-10 bg-muted/80 backdrop-blur px-3 py-2 text-center font-bold whitespace-nowrap border-l">
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
                  className={cn('border-t', i % 2 === 0 ? 'bg-card' : 'bg-muted/20')}
                >
                  <td className="sticky left-0 z-10 backdrop-blur px-3 py-2.5 font-medium whitespace-nowrap border-r bg-inherit">
                    {player.name}
                  </td>
                  {game.rounds.map((r) => (
                    <td
                      key={r.id}
                      className={cn(
                        'px-3 py-2.5 text-center tabular-nums cursor-pointer hover:bg-accent/50 transition-colors',
                        (r.scores[player.id] ?? 0) > 0 && 'text-green-600 dark:text-green-400',
                        (r.scores[player.id] ?? 0) < 0 && 'text-red-500',
                      )}
                      onClick={() => setEditingRound(r)}
                    >
                      {r.scores[player.id] ?? 0}
                    </td>
                  ))}
                  <td className="sticky right-0 z-10 backdrop-blur px-3 py-2.5 text-center font-bold tabular-nums border-l bg-inherit">
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
