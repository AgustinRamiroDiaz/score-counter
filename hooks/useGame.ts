'use client';

import { useGameStore } from '@/lib/store/gameStore';
import { buildLeaderboard } from '@/lib/ai/tools';
import type { Game } from '@/lib/types';

export function useGame(gameId: string) {
  const games = useGameStore((s) => s.games);
  const game = games.find((g) => g.id === gameId) as Game | undefined;

  const leaderboard = game ? buildLeaderboard(game) : [];

  const totalByPlayer = (playerId: string) =>
    game?.rounds.reduce((sum, r) => sum + (r.scores[playerId] ?? 0), 0) ?? 0;

  return { game, leaderboard, totalByPlayer };
}
