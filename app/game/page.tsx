"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useGameStore } from "@/lib/store/gameStore";
import { RoundChart } from "@/components/views/RoundChart";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Player, Round } from "@/lib/types";

function buildEmptyScores(players: Player[]) {
  const scores: Record<string, string> = {};
  for (const player of players) {
    scores[player.id] = "";
  }
  return scores;
}

function buildRoundScores(players: Player[], round: Round) {
  const scores: Record<string, string> = {};
  for (const player of players) {
    scores[player.id] = String(round.scores[player.id] ?? 0);
  }
  return scores;
}

function areScoresComplete(players: Player[], scores: Record<string, string>) {
  return players.every((player) => scores[player.id]?.trim() !== "");
}

function areScoresValid(players: Player[], scores: Record<string, string>) {
  return players.every((player) => {
    const score = scores[player.id];
    return score !== undefined && !Number.isNaN(Number(score));
  });
}

function resolveScores(players: Player[], scores: Record<string, string>) {
  const resolved: Record<string, number> = {};
  for (const player of players) {
    resolved[player.id] = Number(scores[player.id]);
  }
  return resolved;
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
  const id = searchParams.get("id");
  const game = useGameStore((s) =>
    s.games.find((candidate) => candidate.id === id),
  );
  const { addRound, updateRound, deleteRound } = useGameStore();
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [editScores, setEditScores] = useState<Record<string, string>>({});
  const [draftScores, setDraftScores] = useState<Record<string, string>>({});
  const [pendingDeleteRound, setPendingDeleteRound] = useState<Round | null>(
    null,
  );

  if (!game || !id) return null;

  const nextRoundNumber = game.rounds.length + 1;
  const roundsNewestFirst = [...game.rounds].reverse();
  const canSaveDraft =
    game.players.length > 0 &&
    areScoresComplete(game.players, draftScores) &&
    areScoresValid(game.players, draftScores);
  const canSaveEdit =
    game.players.length > 0 &&
    areScoresComplete(game.players, editScores) &&
    areScoresValid(game.players, editScores);

  const handleDraftSave = () => {
    if (!canSaveDraft) return;

    addRound(id, resolveScores(game.players, draftScores));
    setDraftScores(buildEmptyScores(game.players));
  };

  const handleEditStart = (round: Round) => {
    setEditingRoundId(round.id);
    setEditScores(buildRoundScores(game.players, round));
  };

  const handleEditSave = (roundId: string) => {
    if (!canSaveEdit) return;

    updateRound(id, roundId, resolveScores(game.players, editScores));
    setEditingRoundId(null);
    setEditScores({});
  };

  const handleRoundDelete = (roundId: string) => {
    deleteRound(id, roundId);
    setEditingRoundId(null);
    setEditScores({});
    setPendingDeleteRound(null);
  };

  return (
    <div className="flex flex-col pb-6">
      <div className="border-b border-border bg-card/30">
        <RoundChart gameId={id} />
      </div>

      <div className="px-4 pt-4">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Round history
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-1 whitespace-nowrap px-3 text-center">
                  Round
                </TableHead>
                {game.players.map((player) => (
                  <TableHead key={player.id} className="min-w-28 text-center">
                    {player.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-primary/5 hover:bg-primary/10">
                <TableCell className="w-1 whitespace-nowrap px-3 text-center">
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5"
                    disabled={!canSaveDraft}
                    onClick={handleDraftSave}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
                {game.players.map((player) => (
                  <TableCell key={player.id} className="min-w-28 text-center">
                    <Input
                      type="number"
                      inputMode="numeric"
                      aria-label={`${player.name} score for round ${nextRoundNumber}`}
                      placeholder="0"
                      value={draftScores[player.id] ?? ""}
                      onChange={(event) =>
                        setDraftScores((current) => ({
                          ...current,
                          [player.id]: event.target.value,
                        }))
                      }
                      className="mx-auto h-9 w-24 bg-background text-center font-semibold tabular-nums"
                    />
                  </TableCell>
                ))}
              </TableRow>

              {roundsNewestFirst.map((round) => {
                const isEditing = editingRoundId === round.id;

                return (
                  <TableRow
                    key={round.id}
                    className={cn(
                      "cursor-pointer",
                      isEditing && "bg-muted/60 hover:bg-muted/60",
                    )}
                    onClick={() => handleEditStart(round)}
                  >
                    <TableCell className="w-1 whitespace-nowrap px-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            type="button"
                            size="icon-sm"
                            aria-label={`Save round ${round.number}`}
                            disabled={!canSaveEdit}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleEditSave(round.id);
                            }}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon-sm"
                            aria-label={`Delete round ${round.number}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setPendingDeleteRound(round);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="font-semibold tabular-nums text-muted-foreground">
                          {round.number}
                        </span>
                      )}
                    </TableCell>
                    {game.players.map((player) => {
                      const score = round.scores[player.id] ?? 0;

                      return (
                        <TableCell
                          key={player.id}
                          className={cn(
                            "text-center font-semibold tabular-nums",
                            !isEditing && score > 0 && "text-primary/90",
                            !isEditing && score < 0 && "text-destructive",
                          )}
                        >
                          {isEditing ? (
                            <Input
                              type="number"
                              inputMode="numeric"
                              aria-label={`${player.name} score for round ${round.number}`}
                              value={editScores[player.id] ?? ""}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) =>
                                setEditScores((current) => ({
                                  ...current,
                                  [player.id]: event.target.value,
                                }))
                              }
                              className="mx-auto h-9 w-24 bg-background text-center font-semibold tabular-nums"
                            />
                          ) : (
                            formatScore(score)
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={pendingDeleteRound !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteRound(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete round?</DialogTitle>
            <DialogDescription>
              {pendingDeleteRound
                ? `Round ${pendingDeleteRound.number} will be removed from this game.`
                : "This round will be removed from this game."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (pendingDeleteRound) {
                  handleRoundDelete(pendingDeleteRound.id);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
