'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Game, Player, Round } from '@/lib/types';

interface GameState {
  games: Game[];
  activeGameId: string | null;

  createGame: (name: string, players: Omit<Player, 'id'>[]) => string;
  deleteGame: (id: string) => void;
  setActiveGame: (id: string | null) => void;
  getGame: (id: string) => Game | undefined;

  addPlayer: (gameId: string, player: Omit<Player, 'id'>) => void;
  updatePlayer: (gameId: string, playerId: string, patch: Partial<Omit<Player, 'id'>>) => void;
  removePlayer: (gameId: string, playerId: string) => void;

  addRound: (gameId: string, scores: Record<string, number>) => void;
  updateRound: (gameId: string, roundId: string, scores: Record<string, number>) => void;
  undoLastRound: (gameId: string) => void;
}

function newId() {
  return crypto.randomUUID();
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      games: [],
      activeGameId: null,

      createGame: (name, players) => {
        const id = newId();
        const newGame: Game = {
          id,
          name,
          createdAt: Date.now(),
          players: players.map((p) => ({ ...p, id: newId() })),
          rounds: [],
        };
        set((s) => ({ games: [...s.games, newGame] }));
        return id;
      },

      deleteGame: (id) =>
        set((s) => ({
          games: s.games.filter((g) => g.id !== id),
          activeGameId: s.activeGameId === id ? null : s.activeGameId,
        })),

      setActiveGame: (id) => set({ activeGameId: id }),

      getGame: (id) => get().games.find((g) => g.id === id),

      addPlayer: (gameId, player) =>
        set((s) => ({
          games: s.games.map((g) =>
            g.id !== gameId
              ? g
              : { ...g, players: [...g.players, { ...player, id: newId() }] },
          ),
        })),

      updatePlayer: (gameId, playerId, patch) =>
        set((s) => ({
          games: s.games.map((g) =>
            g.id !== gameId
              ? g
              : {
                  ...g,
                  players: g.players.map((p) =>
                    p.id !== playerId ? p : { ...p, ...patch },
                  ),
                },
          ),
        })),

      removePlayer: (gameId, playerId) =>
        set((s) => ({
          games: s.games.map((g) =>
            g.id !== gameId
              ? g
              : { ...g, players: g.players.filter((p) => p.id !== playerId) },
          ),
        })),

      addRound: (gameId, scores) =>
        set((s) => {
          const game = s.games.find((g) => g.id === gameId);
          if (!game) return s;
          const round: Round = {
            id: newId(),
            number: game.rounds.length + 1,
            scores,
          };
          return {
            games: s.games.map((g) =>
              g.id !== gameId ? g : { ...g, rounds: [...g.rounds, round] },
            ),
          };
        }),

      updateRound: (gameId, roundId, scores) =>
        set((s) => ({
          games: s.games.map((g) =>
            g.id !== gameId
              ? g
              : {
                  ...g,
                  rounds: g.rounds.map((r) =>
                    r.id !== roundId ? r : { ...r, scores },
                  ),
                },
          ),
        })),

      undoLastRound: (gameId) =>
        set((s) => ({
          games: s.games.map((g) =>
            g.id !== gameId
              ? g
              : { ...g, rounds: g.rounds.slice(0, -1) },
          ),
        })),
    }),
    { name: 'score-counter-games' },
  ),
);
