'use client';

import { useRouter } from 'next/navigation';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { LLM_MODELS, STT_MODELS, getModelPreset } from '@/lib/config/models';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Bot, Mic, HardDrive, Info } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
export default function SettingsPage() {
  const router = useRouter();
  const { sttModel, llmModel, setSTTModel, setLLMModel } = useSettingsStore();
  const llmPreset = getModelPreset(llmModel, 'llm');
  const sttPreset = getModelPreset(sttModel, 'stt');

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

          <div className="flex flex-col gap-2">
            <Label htmlFor="llm-model" className="flex items-center gap-2">
              <Bot className="h-3.5 w-3.5 text-ai" />
              Language Model
            </Label>
            <Select value={llmModel} onValueChange={(v: string | null) => v && setLLMModel(v)}>
              <SelectTrigger id="llm-model" className="h-11 bg-secondary border-transparent">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {LLM_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{m.label}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {m.size}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {llmPreset && (
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                {llmPreset.description}
              </p>
            )}
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <Label htmlFor="stt-model" className="flex items-center gap-2">
              <Mic className="h-3.5 w-3.5 text-ai" />
              Speech-to-Text Model
            </Label>
            <Select value={sttModel} onValueChange={(v: string | null) => v && setSTTModel(v)}>
              <SelectTrigger id="stt-model" className="h-11 bg-secondary border-transparent">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {STT_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{m.label}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {m.size}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sttPreset && (
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                {sttPreset.description}
              </p>
            )}
          </div>

          <div className="text-xs text-muted-foreground bg-secondary/50 rounded-xl p-3 leading-relaxed">
            Models download on first use and cache in your browser. Downloads can be 75 MB – 3.2 GB
            depending on model. You will see a progress dialog during download.
          </div>
        </div>
      </main>
    </div>
  );
}
