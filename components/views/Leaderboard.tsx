'use client';

import { useGame } from '@/hooks/useGame';
import { cn } from '@/lib/utils';

const MEDALS = ['🥇', '🥈', '🥉'];

const PODIUM_STYLES = [
  'bg-primary/15 border-primary/30',
  'bg-muted/20 border-border',
  'bg-orange-900/20 border-orange-700/30',
];

const PODIUM_HEIGHTS = ['h-24', 'h-32', 'h-20'];

interface Props {
  gameId: string;
}

export function Leaderboard({ gameId }: Props) {
  const { leaderboard, game } = useGame(gameId);

  if (!game || leaderboard.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-5xl mb-4">🏆</p>
        <p className="text-sm">No rounds played yet.</p>
      </div>
    );
  }

  const podium = leaderboard.slice(0, 3);
  // visual order: 2nd, 1st, 3rd
  const visualPodium = [podium[1], podium[0], podium[2]];
  const visualActualIdx = [1, 0, 2];

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Podium */}
      <div className="flex items-end justify-center gap-3 pt-4 pb-2">
        {visualPodium.filter(Boolean).map((entry, visualIdx) => {
          const actualIdx = visualActualIdx[visualIdx];
          if (!entry) return null;
          return (
            <div
              key={entry.player.id}
              className={cn(
                'flex flex-col items-center gap-1 flex-1',
                actualIdx === 1 ? 'order-2' : actualIdx === 0 ? 'order-1' : 'order-3',
              )}
            >
              <span className="text-2xl">{MEDALS[entry.rank - 1] ?? entry.rank}</span>
              <div className="h-10 w-10 rounded-full bg-secondary border-2 border-border flex items-center justify-center font-bold text-xs">
                {entry.player.name.slice(0, 2).toUpperCase()}
              </div>
              <p className="text-xs font-medium text-center leading-tight max-w-16 truncate">
                {entry.player.name}
              </p>
              <p className="font-display text-xl text-primary">{entry.total}</p>
              <div
                className={cn(
                  'w-full rounded-t-lg border',
                  PODIUM_HEIGHTS[actualIdx],
                  PODIUM_STYLES[entry.rank - 1] ?? 'bg-secondary/30 border-border',
                )}
              />
            </div>
          );
        })}
      </div>

      {/* Full list */}
      <div className="flex flex-col gap-2">
        {leaderboard.map((entry) => (
          <div
            key={entry.player.id}
            className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
          >
            <span className="w-6 text-center font-display text-xl text-muted-foreground">
              {entry.rank}
            </span>
            <div className="h-9 w-9 rounded-full bg-secondary border border-border shrink-0 flex items-center justify-center text-xs font-bold">
              {entry.player.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{entry.player.name}</p>
              {entry.player.aliases.length > 0 && (
                <p className="text-xs text-muted-foreground truncate">
                  {entry.player.aliases.join(' · ')}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="font-display text-2xl text-primary">{entry.total}</p>
              {entry.delta < 0 && (
                <p className="text-xs text-muted-foreground">{entry.delta} pts back</p>
              )}
            </div>
            {entry.rank <= 3 && (
              <span className="text-lg shrink-0">{MEDALS[entry.rank - 1]}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
