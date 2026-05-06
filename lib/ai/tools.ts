import { tool } from 'ai';
import { z } from 'zod';
import type { Game, Player } from '@/lib/types';

export interface ToolResult {
  success: boolean;
  message: string;
  data?: unknown;
}

function resolvePlayer(name: string, players: Player[]): Player | undefined {
  const lower = name.toLowerCase();
  return players.find(
    (p) =>
      p.name.toLowerCase() === lower ||
      p.aliases.some((a) => a.toLowerCase() === lower),
  );
}

export function buildLeaderboard(
  game: Game,
): { rank: number; player: Player; total: number; delta: number }[] {
  const totals = game.players.map((p) => ({
    player: p,
    total: game.rounds.reduce((sum, r) => sum + (r.scores[p.id] ?? 0), 0),
  }));
  totals.sort((a, b) => b.total - a.total);
  const best = totals[0]?.total ?? 0;
  let rank = 1;
  return totals.map((entry, i) => {
    if (i > 0 && entry.total < totals[i - 1].total) rank = i + 1;
    return { rank, player: entry.player, total: entry.total, delta: entry.total - best };
  });
}

export interface ToolStore {
  addRound: (gameId: string, scores: Record<string, number>) => void;
  updateRound: (gameId: string, roundId: string, scores: Record<string, number>) => void;
  undoLastRound: (gameId: string) => void;
  updatePlayer: (gameId: string, playerId: string, patch: Partial<Omit<Player, 'id'>>) => void;
  createGame: (name: string, players: Omit<Player, 'id'>[]) => string;
}

export const createTools = (
  game: Game | undefined,
  store: ToolStore,
  navigate: (view: string, gameId?: string) => void,
) => ({
  create_game: tool({
    description: 'Create a new game with a list of players.',
    inputSchema: z.object({
      name: z.string().describe('The name of the game'),
      players: z.array(z.object({
        name: z.string(),
        aliases: z.array(z.string()).optional(),
      })).min(2).describe('At least 2 players required'),
    }),
    execute: async ({ name, players }: { name: string; players: Array<{ name: string; aliases?: string[] }> }) => {
      const newId = store.createGame(
        name.trim(),
        players.map((p) => ({ name: p.name.trim(), aliases: p.aliases ?? [] })),
      );
      navigate('scoring', newId);
      return {
        success: true,
        message: `Game "${name}" created with ${players.length} players! You're all set to score rounds.`,
      };
    },
  }),

  add_round: tool({
    description: 'Record scores for ALL players for a new round. Must include every player.',
    inputSchema: z.object({
      scores: z.record(z.string(), z.number()).describe('Object mapping player name/alias to points'),
    }),
    execute: async ({ scores }: { scores: Record<string, number> }) => {
      if (!game) return { success: false, message: 'No active game.' };
      const resolvedScores: Record<string, number> = {};
      const missing: string[] = [];
      for (const player of game.players) {
        const match = Object.entries(scores).find(([k]) => resolvePlayer(k, game.players)?.id === player.id);
        if (match) {
          resolvedScores[player.id] = match[1] as number;
        } else {
          missing.push(player.name);
        }
      }
      if (missing.length > 0) {
        return { success: false, message: `Missing scores for: ${missing.join(', ')}` };
      }
      store.addRound(game.id, resolvedScores);
      return { success: true, message: `Round ${game.rounds.length + 1} recorded.` };
    },
  }),

  update_round: tool({
    description: 'Correct scores for a past round by its round number.',
    inputSchema: z.object({
      round_number: z.number().int().positive(),
      scores: z.record(z.string(), z.number()),
    }),
    execute: async ({ round_number, scores }: { round_number: number; scores: Record<string, number> }) => {
      if (!game) return { success: false, message: 'No active game.' };
      const round = game.rounds.find((r) => r.number === round_number);
      if (!round) return { success: false, message: `Round ${round_number} not found.` };
      const resolvedScores: Record<string, number> = { ...round.scores };
      for (const [pName, pts] of Object.entries(scores)) {
        const p = resolvePlayer(pName, game.players);
        if (p) resolvedScores[p.id] = pts;
      }
      store.updateRound(game.id, round.id, resolvedScores);
      return { success: true, message: `Round ${round_number} updated.` };
    },
  }),

  undo_last_round: tool({
    description: 'Remove the most recently recorded round.',
    inputSchema: z.object({}),
    execute: async () => {
      if (!game) return { success: false, message: 'No active game.' };
      if (game.rounds.length === 0) return { success: false, message: 'No rounds to undo.' };
      store.undoLastRound(game.id);
      return { success: true, message: 'Last round removed.' };
    },
  }),

  get_leaderboard: tool({
    description: 'Return the current standings sorted by total score.',
    inputSchema: z.object({}),
    execute: async () => {
      if (!game) return { success: false, message: 'No active game.' };
      const lb = buildLeaderboard(game);
      const summary = lb.map((e) => `${e.rank}. ${e.player.name}: ${e.total}`).join('\n');
      return { success: true, message: `Current standings:\n${summary}`, data: lb };
    },
  }),

  update_player: tool({
    description: 'Rename a player or update their aliases.',
    inputSchema: z.object({
      target: z.string().describe('Current name or alias'),
      name: z.string().optional(),
      aliases: z.array(z.string()).optional(),
    }),
    execute: async ({ target, name: newName, aliases }: { target: string; name?: string; aliases?: string[] }) => {
      if (!game) return { success: false, message: 'No active game.' };
      const player = resolvePlayer(target, game.players);
      if (!player) return { success: false, message: `Player "${target}" not found.` };
      store.updatePlayer(game.id, player.id, {
        ...(newName ? { name: newName } : {}),
        ...(aliases ? { aliases } : {}),
      });
      return { success: true, message: `Player updated.` };
    },
  }),

  navigate: tool({
    description: 'Switch to a different view (scoring, leaderboard, chart, or table).',
    inputSchema: z.object({
      view: z.enum(['scoring', 'leaderboard', 'chart', 'table']),
    }),
    execute: async ({ view }: { view: 'scoring' | 'leaderboard' | 'chart' | 'table' }) => {
      if (!game) return { success: false, message: 'No active game to navigate within.' };
      navigate(view, game.id);
      return { success: true, message: `Navigated to ${view}.` };
    },
  }),
});
