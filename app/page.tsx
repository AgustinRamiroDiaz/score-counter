'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/lib/store/gameStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { PlayerForm } from '@/components/game/PlayerForm';
import { Settings, Plus, Trash2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Player } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const { games, createGame, deleteGame } = useGameStore();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [step, setStep] = useState<'name' | 'players'>('name');
  const [gameName, setGameName] = useState('');
  const [nameError, setNameError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleStart = () => {
    if (!gameName.trim()) {
      setNameError('Enter a game name.');
      return;
    }
    setNameError('');
    setStep('players');
  };

  const handlePlayers = (players: Omit<Player, 'id'>[]) => {
    const id = createGame(gameName.trim(), players);
    setSheetOpen(false);
    setGameName('');
    setStep('name');
    router.push(`/game/${id}`);
  };

  const openSheet = () => {
    setStep('name');
    setGameName('');
    setNameError('');
    setSheetOpen(true);
  };

  const sorted = [...games].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="min-h-dvh flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-6 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Score Counter</h1>
          <p className="text-sm text-muted-foreground">Track your game scores</p>
        </div>
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </Link>
      </header>

      {/* Game list */}
      <main className="flex-1 px-4 pb-6">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-5xl mb-4">🎲</p>
            <p className="text-lg font-semibold">No games yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              Create a game to start tracking scores
            </p>
            <Button className="h-12 px-6 gap-2" onClick={openSheet}>
              <Plus className="h-4 w-4" />
              New Game
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-2">
            {sorted.map((game) => (
              <Card key={game.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => router.push(`/game/${game.id}`)}
                    >
                      <CardTitle className="text-lg">{game.name}</CardTitle>
                      <CardDescription>
                        {game.players.length} players · {game.rounds.length} rounds
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground h-8 w-8 -mr-1"
                      onClick={() => setDeleteTarget(game.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardFooter
                  className="pt-0 pb-3 cursor-pointer"
                  onClick={() => router.push(`/game/${game.id}`)}
                >
                  <div className="flex items-center justify-between w-full">
                    <p className="text-xs text-muted-foreground">
                      {new Date(game.createdAt).toLocaleDateString()}
                    </p>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      {sorted.length > 0 && (
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
          size="icon"
          onClick={openSheet}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* New game sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>New Game</SheetTitle>
            <SheetDescription>
              {step === 'name' ? 'Give your game a name.' : 'Add the players.'}
            </SheetDescription>
          </SheetHeader>

          {step === 'name' ? (
            <div className="flex flex-col gap-4">
              <div>
                <Label htmlFor="game-name">Game name</Label>
                <Input
                  id="game-name"
                  placeholder="e.g. Poker Night"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                  className="mt-1.5 h-12"
                  autoFocus
                />
                {nameError && <p className="text-sm text-destructive mt-1">{nameError}</p>}
              </div>
              <Button className="h-12" onClick={handleStart}>
                Next: Add Players
              </Button>
            </div>
          ) : (
            <PlayerForm onConfirm={handlePlayers} submitLabel="Start Game" />
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete game?</DialogTitle>
            <DialogDescription>
              This will permanently delete all scores. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) deleteGame(deleteTarget);
                setDeleteTarget(null);
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
