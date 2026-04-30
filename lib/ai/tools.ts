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

export type ToolArgs = {
  add_round: { scores: Record<string, number> };
  update_round: { round_number: number; scores: Record<string, number> };
  undo_last_round: Record<string, never>;
  get_leaderboard: Record<string, never>;
  update_player: { target: string; name?: string; aliases?: string[] };
  navigate: { view: 'scoring' | 'leaderboard' | 'chart' | 'table' };
  create_game: {
    name: string;
    players: Array<{ name: string; aliases?: string[] }>;
  };
};

export type ToolName = keyof ToolArgs;

export interface ToolStore {
  addRound: (gameId: string, scores: Record<string, number>) => void;
  updateRound: (gameId: string, roundId: string, scores: Record<string, number>) => void;
  undoLastRound: (gameId: string) => void;
  updatePlayer: (gameId: string, playerId: string, patch: Partial<Omit<Player, 'id'>>) => void;
  createGame: (name: string, players: Omit<Player, 'id'>[]) => string;
}

export function executeTool<K extends ToolName>(
  name: K,
  args: ToolArgs[K],
  game: Game | undefined,
  store: ToolStore,
  navigate: (view: string, gameId?: string) => void,
): ToolResult {
  switch (name) {
    case 'create_game': {
      const { name: gameName, players } = args as ToolArgs['create_game'];
      if (!gameName?.trim()) return { success: false, message: 'A game name is required.' };
      if (!players || players.length < 2) {
        return { success: false, message: 'At least 2 players are required.' };
      }
      const newId = store.createGame(
        gameName.trim(),
        players.map((p) => ({ name: p.name.trim(), aliases: p.aliases ?? [] })),
      );
      navigate('scoring', newId);
      return {
        success: true,
        message: `Game "${gameName}" created with ${players.length} players! You're all set to score rounds.`,
      };
    }

    case 'add_round': {
      if (!game) return { success: false, message: 'No active game.' };
      const { scores } = args as ToolArgs['add_round'];
      const resolvedScores: Record<string, number> = {};
      const missing: string[] = [];
      for (const player of game.players) {
        const match = Object.entries(scores).find(([k]) => resolvePlayer(k, game.players)?.id === player.id);
        if (match) {
          resolvedScores[player.id] = match[1];
        } else {
          missing.push(player.name);
        }
      }
      if (missing.length > 0) {
        return { success: false, message: `Missing scores for: ${missing.join(', ')}` };
      }
      store.addRound(game.id, resolvedScores);
      return { success: true, message: `Round ${game.rounds.length + 1} recorded.` };
    }

    case 'update_round': {
      if (!game) return { success: false, message: 'No active game.' };
      const { round_number, scores } = args as ToolArgs['update_round'];
      const round = game.rounds.find((r) => r.number === round_number);
      if (!round) return { success: false, message: `Round ${round_number} not found.` };
      const resolvedScores: Record<string, number> = { ...round.scores };
      for (const [pName, pts] of Object.entries(scores)) {
        const p = resolvePlayer(pName, game.players);
        if (p) resolvedScores[p.id] = pts;
      }
      store.updateRound(game.id, round.id, resolvedScores);
      return { success: true, message: `Round ${round_number} updated.` };
    }

    case 'undo_last_round': {
      if (!game) return { success: false, message: 'No active game.' };
      if (game.rounds.length === 0) return { success: false, message: 'No rounds to undo.' };
      store.undoLastRound(game.id);
      return { success: true, message: 'Last round removed.' };
    }

    case 'get_leaderboard': {
      if (!game) return { success: false, message: 'No active game.' };
      const lb = buildLeaderboard(game);
      const summary = lb.map((e) => `${e.rank}. ${e.player.name}: ${e.total}`).join('\n');
      return { success: true, message: `Current standings:\n${summary}`, data: lb };
    }

    case 'update_player': {
      if (!game) return { success: false, message: 'No active game.' };
      const { target, name: newName, aliases } = args as ToolArgs['update_player'];
      const player = resolvePlayer(target, game.players);
      if (!player) return { success: false, message: `Player "${target}" not found.` };
      store.updatePlayer(game.id, player.id, {
        ...(newName ? { name: newName } : {}),
        ...(aliases ? { aliases } : {}),
      });
      return { success: true, message: `Player updated.` };
    }

    case 'navigate': {
      if (!game) return { success: false, message: 'No active game to navigate within.' };
      const { view } = args as ToolArgs['navigate'];
      navigate(view, game.id);
      return { success: true, message: `Navigated to ${view}.` };
    }

    default:
      return { success: false, message: `Unknown tool: ${name as string}` };
  }
}
