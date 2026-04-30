'use client';

import { useRouter } from 'next/navigation';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Bot, Mic } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { sttModel, llmModel, setSTTModel, setLLMModel } = useSettingsStore();

  return (
    <div className="min-h-dvh flex flex-col max-w-lg mx-auto">
      <header className="flex items-center gap-2 px-2 py-2 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-display text-xl tracking-wide">SETTINGS</h1>
      </header>

      <main className="flex-1 px-4 py-5 flex flex-col gap-5">
        <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            AI Models
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="llm-model" className="flex items-center gap-2">
              <Bot className="h-3.5 w-3.5 text-ai" />
              Language Model
            </Label>
            <Input
              id="llm-model"
              value={llmModel}
              onChange={(e) => setLLMModel(e.target.value)}
              placeholder="HuggingFaceTB/SmolLM3-3B"
              className="h-11 bg-secondary border-transparent focus-visible:border-ai/50"
            />
            <p className="text-xs text-muted-foreground">
              Hugging Face model ID for chat & tool calling. Runs in-browser.
            </p>
          </div>

          <Separator />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stt-model" className="flex items-center gap-2">
              <Mic className="h-3.5 w-3.5 text-ai" />
              Speech-to-Text Model
            </Label>
            <Input
              id="stt-model"
              value={sttModel}
              onChange={(e) => setSTTModel(e.target.value)}
              placeholder="openai/whisper-base"
              className="h-11 bg-secondary border-transparent focus-visible:border-ai/50"
            />
            <p className="text-xs text-muted-foreground">
              Hugging Face model ID for voice transcription. Runs in-browser.
            </p>
          </div>

          <div className="text-xs text-muted-foreground bg-secondary/50 rounded-xl p-3 leading-relaxed">
            Models download on first use and cache in your browser. Larger models may take a few
            minutes and require 2–4 GB of RAM.
          </div>
        </div>
      </main>
    </div>
  );
}
