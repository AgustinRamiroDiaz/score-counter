'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Player, Round } from '@/lib/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: Player[];
  roundNumber: number;
  existingRound?: Round;
  onConfirm: (scores: Record<string, number>) => void;
}

function buildInitialScores(players: Player[], existingRound?: Round): Record<string, string> {
  const initial: Record<string, string> = {};
  for (const p of players) {
    initial[p.id] = existingRound ? String(existingRound.scores[p.id] ?? 0) : '';
  }
  return initial;
}

export function RoundSheet({
  open,
  onOpenChange,
  players,
  roundNumber,
  existingRound,
  onConfirm,
}: Props) {
  // State is initialised once per mount. Callers must pass a changing `key`
  // prop to reset the form (e.g. key={editingRound?.id ?? 'new'}).
  const [scores, setScores] = useState<Record<string, string>>(() =>
    buildInitialScores(players, existingRound),
  );

  const allFilled = players.every((p) => scores[p.id]?.trim() !== '');
  const allValid = players.every((p) => !isNaN(Number(scores[p.id])));

  const handleConfirm = () => {
    const resolved: Record<string, number> = {};
    for (const p of players) {
      resolved[p.id] = Number(scores[p.id]);
    }
    onConfirm(resolved);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>
            {existingRound ? `Edit Round ${roundNumber}` : `Score Round ${roundNumber}`}
          </SheetTitle>
          <SheetDescription>
            Enter scores for all players. All fields are required.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 py-2">
          {players.map((player) => (
            <div key={player.id} className="flex items-center gap-3">
              <Label
                htmlFor={`score-${player.id}`}
                className="w-28 shrink-0 font-medium truncate"
              >
                {player.name}
              </Label>
              <Input
                id={`score-${player.id}`}
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={scores[player.id] ?? ''}
                onChange={(e) =>
                  setScores((s) => ({ ...s, [player.id]: e.target.value }))
                }
                className="h-12 text-lg text-center"
              />
            </div>
          ))}
        </div>

        <SheetFooter className="pt-4">
          <Button
            className="w-full h-12 text-base"
            disabled={!allFilled || !allValid}
            onClick={handleConfirm}
          >
            {existingRound ? 'Save Changes' : 'Confirm Round'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
