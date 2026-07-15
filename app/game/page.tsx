'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGameStore } from '@/lib/store/gameStore';
import { RoundSheet } from '@/components/game/RoundSheet';
import { RoundChart } from '@/components/views/RoundChart';
import { Button } from '@/components/ui/button';
import { Plus, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Round } from '@/lib/types';

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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRound, setEditingRound] = useState<Round | null>(null);

  if (!game || !id) return null;

  const nextRoundNumber = game.rounds.length + 1;
  const roundsNewestFirst = [...game.rounds].reverse();

  return (
    <div className="flex flex-col pb-24">
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

        {game.rounds.length > 0 ? (
          <div className="flex flex-col gap-2">
            {roundsNewestFirst.map((round) => (
              <button
                key={round.id}
                type="button"
                className="rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
                onClick={() => setEditingRound(round)}
              >
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Round {round.number}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Edit</p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                  {game.players.map((p) => {
                    const score = round.scores[p.id] ?? 0;
                    return (
                      <span key={p.id} className="text-sm">
                        <span className="text-muted-foreground">{p.name}: </span>
                        <span className={cn(
                          'font-semibold tabular-nums',
                          score > 0 && 'text-primary/90',
                          score < 0 && 'text-destructive',
                        )}>
                          {score > 0 ? `+${score}` : score}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card/50 px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No rounds recorded yet.</p>
          </div>
        )}
      </div>

      <Button
        className="fixed bottom-6 left-4 h-14 w-14 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
        size="icon"
        onClick={() => setSheetOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <RoundSheet
        key={sheetOpen ? 'open' : 'closed'}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        players={game.players}
        roundNumber={nextRoundNumber}
        onConfirm={(scores) => addRound(id, scores)}
      />

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
