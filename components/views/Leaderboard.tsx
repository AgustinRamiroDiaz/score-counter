'use client';

import { useGame } from '@/hooks/useGame';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const MEDALS = ['🥇', '🥈', '🥉'];
const RANK_COLORS = [
  'bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700',
  'bg-gray-100 border-gray-300 dark:bg-gray-800/50 dark:border-gray-600',
  'bg-orange-100 border-orange-300 dark:bg-orange-900/30 dark:border-orange-700',
];

interface Props {
  gameId: string;
}

export function Leaderboard({ gameId }: Props) {
  const { leaderboard, game } = useGame(gameId);

  if (!game || leaderboard.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-4xl mb-3">🏆</p>
        <p className="text-sm">No rounds played yet.</p>
      </div>
    );
  }

  const podium = leaderboard.slice(0, 3);

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Podium */}
      <div className="flex items-end justify-center gap-3 pt-4 pb-2">
        {[podium[1], podium[0], podium[2]].filter(Boolean).map((entry, visualIdx) => {
          const heights = ['h-24', 'h-32', 'h-20'];
          const actualRank = visualIdx === 0 ? 1 : visualIdx === 1 ? 0 : 2;
          const e = podium[actualRank];
          if (!e) return null;
          return (
            <div
              key={e.player.id}
              className={cn(
                'flex flex-col items-center gap-1 flex-1',
                actualRank === 1 ? 'order-2' : actualRank === 0 ? 'order-1' : 'order-3',
              )}
            >
              <span className="text-2xl">{MEDALS[e.rank - 1] ?? e.rank}</span>
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarFallback className="text-sm font-bold">
                  {e.player.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="text-xs font-medium text-center leading-tight max-w-16 truncate">
                {e.player.name}
              </p>
              <p className="text-sm font-bold">{e.total}</p>
              <div
                className={cn(
                  'w-full rounded-t-lg border',
                  heights[actualRank],
                  RANK_COLORS[e.rank - 1] ?? 'bg-secondary',
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
            className="flex items-center gap-3 p-3 rounded-xl border bg-card"
          >
            <span className="w-6 text-center text-sm font-bold text-muted-foreground">
              {entry.rank}
            </span>
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="text-xs font-semibold">
                {entry.player.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{entry.player.name}</p>
              {entry.player.aliases.length > 0 && (
                <p className="text-xs text-muted-foreground truncate">
                  {entry.player.aliases.join(' · ')}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">{entry.total}</p>
              {entry.delta < 0 && (
                <p className="text-xs text-muted-foreground">{entry.delta}</p>
              )}
            </div>
            {entry.rank <= 3 && (
              <Badge
                variant="secondary"
                className={cn('shrink-0', RANK_COLORS[entry.rank - 1])}
              >
                {MEDALS[entry.rank - 1]}
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
