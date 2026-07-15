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
  getGames: () => Game[];
  getGame: (id: string) => Game | undefined;
  getActiveGameId: () => string | null;
  setActiveGame: (id: string | null) => void;
  addRound: (gameId: string, scores: Record<string, number>) => void;
  updateRound: (gameId: string, roundId: string, scores: Record<string, number>) => void;
  undoLastRound: (gameId: string) => void;
  updatePlayer: (gameId: string, playerId: string, patch: Partial<Omit<Player, 'id'>>) => void;
  createGame: (name: string, players: Omit<Player, 'id'>[]) => string;
}

function gameSummary(game: Game) {
  const leaderboard = buildLeaderboard(game);
  return {
    id: game.id,
    name: game.name,
    createdAt: game.createdAt,
    players: game.players.map((player) => ({
      id: player.id,
      name: player.name,
      aliases: player.aliases,
    })),
    roundCount: game.rounds.length,
    latestRound: game.rounds.at(-1) ?? null,
    leaderboard: leaderboard.map((entry) => ({
      rank: entry.rank,
      player: entry.player.name,
      total: entry.total,
      delta: entry.delta,
    })),
  };
}

export const createTools = (
  currentGameId: string | undefined,
  store: ToolStore,
  navigate: (view: string, gameId?: string) => void,
) => {
  const getSelectedGame = (): Game | undefined => {
    const selectedId = currentGameId ?? store.getActiveGameId();
    return selectedId ? store.getGame(selectedId) : undefined;
  };

  return {
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
        store.setActiveGame(newId);
        navigate('scoring', newId);
        return {
          success: true,
          message: `Game "${name}" created with ${players.length} players and selected as the current game.`,
          data: { gameId: newId },
        };
      },
    }),

    list_games: tool({
      description: 'List all saved games and identify the current selected game.',
      inputSchema: z.object({}),
      execute: async () => {
        const activeId = store.getActiveGameId();
        const games = store.getGames().map((game) => ({
          id: game.id,
          name: game.name,
          playerCount: game.players.length,
          roundCount: game.rounds.length,
          selected: game.id === activeId,
        }));
        return {
          success: true,
          message: games.length > 0 ? 'Saved games listed.' : 'There are no saved games yet.',
          data: { games },
        };
      },
    }),

    select_game: tool({
      description: 'Select an existing game by exact name or id and navigate to it.',
      inputSchema: z.object({
        game: z.string().describe('The exact game name or game id to select'),
        view: z.enum(['scoring', 'leaderboard', 'chart', 'table']).optional(),
      }),
      execute: async ({ game: gameQuery, view }: { game: string; view?: 'scoring' | 'leaderboard' | 'chart' | 'table' }) => {
        const lower = gameQuery.toLowerCase();
        const match = store
          .getGames()
          .find((candidate) => candidate.id === gameQuery || candidate.name.toLowerCase() === lower);
        if (!match) return { success: false, message: `Game "${gameQuery}" not found.` };
        store.setActiveGame(match.id);
        navigate(view ?? 'scoring', match.id);
        return {
          success: true,
          message: `Selected "${match.name}".`,
          data: gameSummary(match),
        };
      },
    }),

    get_current_game: tool({
      description: 'Fetch details about the current selected game, including players, latest round, and standings.',
      inputSchema: z.object({}),
      execute: async () => {
        const game = getSelectedGame();
        if (!game) return { success: false, message: 'No active game.' };
        return {
          success: true,
          message: `Current game is "${game.name}".`,
          data: gameSummary(game),
        };
      },
    }),

    add_round: tool({
      description: 'Record scores for ALL players for a new round. Must include every player.',
      inputSchema: z.object({
        scores: z.record(z.string(), z.number()).describe('Object mapping player name/alias to points'),
      }),
      execute: async ({ scores }: { scores: Record<string, number> }) => {
        const game = getSelectedGame();
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
        const game = getSelectedGame();
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
        const game = getSelectedGame();
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
        const game = getSelectedGame();
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
        const game = getSelectedGame();
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
        const game = getSelectedGame();
        if (!game) return { success: false, message: 'No active game to navigate within.' };
        store.setActiveGame(game.id);
        navigate(view, game.id);
        return { success: true, message: `Navigated to ${view}.` };
      },
    }),
  };
};
