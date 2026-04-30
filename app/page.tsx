'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/lib/store/gameStore';
import { useChatContext } from '@/context/ChatContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Settings, Plus, Trash2, ChevronRight, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import type { Player } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const { games, createGame, deleteGame } = useGameStore();
  const { open: openChat } = useChatContext();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [step, setStep] = useState<'name' | 'players'>('name');
  const [gameName, setGameName] = useState('');
  const [nameError, setNameError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleStart = () => {
    if (!gameName.trim()) { setNameError('Enter a game name.'); return; }
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
      <header className="flex items-center justify-between px-4 pt-8 pb-6">
        <div>
          <h1 className="font-display text-5xl text-primary leading-none tracking-wide">
            SCORE
          </h1>
          <h1 className="font-display text-5xl text-foreground leading-none tracking-wide -mt-1">
            COUNTER
          </h1>
        </div>
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Settings className="h-5 w-5" />
          </Button>
        </Link>
      </header>

      {/* Body */}
      <main className="flex-1 px-4 pb-28">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
            <div className="h-20 w-20 rounded-2xl bg-card border border-border flex items-center justify-center text-4xl">
              🎲
            </div>
            <div>
              <p className="text-lg font-bold">No games yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create one below or ask the AI</p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button className="h-12 gap-2 text-base font-semibold" onClick={openSheet}>
                <Plus className="h-4 w-4" />
                New Game
              </Button>
              <Button
                variant="outline"
                className="h-12 gap-2 border-ai/30 text-ai hover:bg-ai/10 hover:text-ai hover:border-ai/50"
                onClick={openChat}
              >
                <MessageSquare className="h-4 w-4" />
                Create with AI chat
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Your Games
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-ai/30 text-ai hover:bg-ai/10 hover:text-ai hover:border-ai/50 text-xs"
                onClick={openChat}
              >
                <MessageSquare className="h-3 w-3" />
                New via chat
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              {sorted.map((game, i) => {
                const topPlayer = [...game.players]
                  .map((p) => ({
                    p,
                    total: game.rounds.reduce((s, r) => s + (r.scores[p.id] ?? 0), 0),
                  }))
                  .sort((a, b) => b.total - a.total)[0];

                return (
                  <div
                    key={game.id}
                    className="group relative flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all cursor-pointer"
                    onClick={() => router.push(`/game/${game.id}`)}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    {/* Rank indicator */}
                    <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <span className="font-display text-2xl text-primary">{i + 1}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base truncate">{game.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {game.players.length} players · {game.rounds.length} rounds
                        {topPlayer && game.rounds.length > 0 && (
                          <span className="text-primary/80 ml-2">
                            · 🥇 {topPlayer.p.name}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(game.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* FAB */}
      {sorted.length > 0 && (
        <Button
          className="fixed bottom-6 left-4 h-14 w-14 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
          style={{ right: 'auto' }}
          size="icon"
          onClick={openSheet}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* New game sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90dvh] overflow-y-auto bg-card">
          <SheetHeader className="pb-4">
            <SheetTitle className="font-display text-2xl tracking-wide">
              {step === 'name' ? 'NEW GAME' : 'ADD PLAYERS'}
            </SheetTitle>
            <SheetDescription>
              {step === 'name' ? 'Give your game a name.' : "Who's playing?"}
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
                  className="mt-1.5 h-12 bg-secondary border-transparent"
                  autoFocus
                />
                {nameError && <p className="text-sm text-destructive mt-1">{nameError}</p>}
              </div>
              <Button className="h-12 font-semibold" onClick={handleStart}>
                Next — Add Players
              </Button>
            </div>
          ) : (
            <PlayerForm onConfirm={handlePlayers} submitLabel="Start Game" />
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Delete game?</DialogTitle>
            <DialogDescription>All scores will be permanently deleted.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
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
