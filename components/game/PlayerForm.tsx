'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus, UserPlus } from 'lucide-react';
import type { Player } from '@/lib/types';

interface DraftPlayer {
  name: string;
  aliases: string;
}

interface Props {
  onConfirm: (players: Omit<Player, 'id'>[]) => void;
  initialPlayers?: Omit<Player, 'id'>[];
  submitLabel?: string;
}

export function PlayerForm({ onConfirm, initialPlayers = [], submitLabel = 'Continue' }: Props) {
  const [players, setPlayers] = useState<DraftPlayer[]>(
    initialPlayers.length > 0
      ? initialPlayers.map((p) => ({ name: p.name, aliases: p.aliases.join(', ') }))
      : [{ name: '', aliases: '' }],
  );
  const [error, setError] = useState('');

  const addPlayer = () => setPlayers((p) => [...p, { name: '', aliases: '' }]);

  const removePlayer = (i: number) =>
    setPlayers((p) => p.filter((_, idx) => idx !== i));

  const update = (i: number, field: keyof DraftPlayer, value: string) =>
    setPlayers((p) => p.map((pl, idx) => (idx === i ? { ...pl, [field]: value } : pl)));

  const handleConfirm = () => {
    const filled = players.filter((p) => p.name.trim());
    if (filled.length < 2) {
      setError('Add at least 2 players to start.');
      return;
    }
    const names = filled.map((p) => p.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      setError('Player names must be unique.');
      return;
    }
    setError('');
    onConfirm(
      filled.map((p) => ({
        name: p.name.trim(),
        aliases: p.aliases
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
      })),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {players.map((p, i) => (
          <div key={i} className="flex flex-col gap-1.5 rounded-lg border p-3 bg-card">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label htmlFor={`player-name-${i}`} className="text-xs text-muted-foreground mb-1 block">
                  Player {i + 1}
                </Label>
                <Input
                  id={`player-name-${i}`}
                  placeholder="Name"
                  value={p.name}
                  onChange={(e) => update(i, 'name', e.target.value)}
                  className="h-11"
                />
              </div>
              {players.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-5 shrink-0 text-muted-foreground"
                  onClick={() => removePlayer(i)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Input
              placeholder="Aliases (comma-separated, optional)"
              value={p.aliases}
              onChange={(e) => update(i, 'aliases', e.target.value)}
              className="h-9 text-sm text-muted-foreground"
            />
            {p.aliases.trim() && (
              <div className="flex flex-wrap gap-1">
                {p.aliases.split(',').filter((a) => a.trim()).map((a, j) => (
                  <Badge key={j} variant="secondary" className="text-xs">
                    {a.trim()}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Button variant="outline" className="gap-2 h-11" onClick={addPlayer}>
        <UserPlus className="h-4 w-4" />
        Add player
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button className="h-12 text-base" onClick={handleConfirm}>
        <Plus className="h-4 w-4 mr-2" />
        {submitLabel}
      </Button>
    </div>
  );
}
