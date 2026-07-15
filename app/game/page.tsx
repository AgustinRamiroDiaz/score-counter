'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGameStore } from '@/lib/store/gameStore';
import { RoundSheet } from '@/components/game/RoundSheet';
import { RoundChart } from '@/components/views/RoundChart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Check, Pencil, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FormEvent } from 'react';
import type { Player, Round } from '@/lib/types';

function buildEmptyScores(players: Player[]) {
  const scores: Record<string, string> = {};
  for (const player of players) {
    scores[player.id] = '';
  }
  return scores;
}

function formatScore(score: number) {
  return score > 0 ? `+${score}` : score;
}

export default function ScoringPage() {
  return (
    <Suspense fallback={null}>
      <ScoringPageContent />
    </Suspense>
  );
}

function ScoringPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const game = useGameStore((s) => s.games.find((candidate) => candidate.id === id));
  const { addRound, updateRound, undoLastRound } = useGameStore();
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [draftScores, setDraftScores] = useState<Record<string, string>>({});

  if (!game || !id) return null;

  const nextRoundNumber = game.rounds.length + 1;
  const roundsNewestFirst = [...game.rounds].reverse();
  const allDraftScoresFilled = game.players.every(
    (player) => draftScores[player.id]?.trim() !== '',
  );
  const allDraftScoresValid = game.players.every((player) => {
    const score = draftScores[player.id];
    return score !== undefined && !Number.isNaN(Number(score));
  });
  const canSaveDraft =
    game.players.length > 0 && allDraftScoresFilled && allDraftScoresValid;

  const handleDraftSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSaveDraft) return;

    const scores: Record<string, number> = {};
    for (const player of game.players) {
      scores[player.id] = Number(draftScores[player.id]);
    }
    addRound(id, scores);
    setDraftScores(buildEmptyScores(game.players));
  };

  return (
    <div className="flex flex-col pb-6">
      <div className="border-b border-border bg-card/30">
        <RoundChart gameId={id} />
      </div>

      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Round history
          </p>
          {game.rounds.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground h-7 text-xs"
              onClick={() => undoLastRound(id)}
            >
              <Undo2 className="h-3 w-3" />
              Undo last
            </Button>
          )}
        </div>

        <form onSubmit={handleDraftSubmit}>
          <div className="rounded-xl border border-border bg-card">
            <Table className="min-w-max">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-20 pl-3">Round</TableHead>
                  {game.players.map((player) => (
                    <TableHead key={player.id} className="min-w-28">
                      {player.name}
                    </TableHead>
                  ))}
                  <TableHead className="w-20 pr-3 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-primary/5 hover:bg-primary/10">
                  <TableCell className="pl-3 font-semibold tabular-nums text-primary">
                    {nextRoundNumber}
                  </TableCell>
                  {game.players.map((player) => (
                    <TableCell key={player.id} className="min-w-28">
                      <Input
                        type="number"
                        inputMode="numeric"
                        aria-label={`${player.name} score for round ${nextRoundNumber}`}
                        placeholder="0"
                        value={draftScores[player.id] ?? ''}
                        onChange={(event) =>
                          setDraftScores((current) => ({
                            ...current,
                            [player.id]: event.target.value,
                          }))
                        }
                        className="h-9 w-24 bg-background text-center font-semibold tabular-nums"
                      />
                    </TableCell>
                  ))}
                  <TableCell className="pr-3 text-right">
                    <Button
                      type="submit"
                      size="sm"
                      className="gap-1.5"
                      disabled={!canSaveDraft}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Save
                    </Button>
                  </TableCell>
                </TableRow>

                {roundsNewestFirst.map((round) => (
                  <TableRow key={round.id}>
                    <TableCell className="pl-3 font-semibold tabular-nums text-muted-foreground">
                      {round.number}
                    </TableCell>
                    {game.players.map((player) => {
                      const score = round.scores[player.id] ?? 0;
                      return (
                        <TableCell
                          key={player.id}
                          className={cn(
                            'font-semibold tabular-nums',
                            score > 0 && 'text-primary/90',
                            score < 0 && 'text-destructive',
                          )}
                        >
                          {formatScore(score)}
                        </TableCell>
                      );
                    })}
                    <TableCell className="pr-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-muted-foreground"
                        onClick={() => setEditingRound(round)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </form>
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
            updateRound(id, editingRound.id, scores);
            setEditingRound(null);
          }}
        />
      )}
    </div>
  );
}
