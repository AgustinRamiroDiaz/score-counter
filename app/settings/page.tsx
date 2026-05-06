'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { LLM_MODELS, STT_MODELS, getModelPreset, isModelCached } from '@/lib/config/models';
import { useLLM } from '@/lib/ai/useLLM';
import { useSTT } from '@/lib/ai/useSTT';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Bot, Mic, HardDrive, Info, CheckCircle2, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  const { load: loadLLM } = useLLM();
  const { load: loadSTT } = useSTT();

  const [cachedModels, setCachedModels] = useState<Record<string, boolean>>({});

  const refreshCacheStatus = useCallback(async () => {
    const status: Record<string, boolean> = {};
    const allModels = [...LLM_MODELS, ...STT_MODELS];
    await Promise.all(
      allModels.map(async (m) => {
        status[m.id] = await isModelCached(m.id);
      }),
    );
    setCachedModels(status);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function check() {
      const status: Record<string, boolean> = {};
      const allModels = [...LLM_MODELS, ...STT_MODELS];
      await Promise.all(
        allModels.map(async (m) => {
          status[m.id] = await isModelCached(m.id);
        }),
      );
      if (mounted) {
        setCachedModels(status);
      }
    }

    check();

    return () => {
      mounted = false;
    };
  }, []);

  const llmPreset = getModelPreset(llmModel, 'llm');
  const sttPreset = getModelPreset(sttModel, 'stt');

  const isLLMCached = cachedModels[llmModel];
  const isSTTCached = cachedModels[sttModel];

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

          <div className="flex flex-col gap-3">
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
                      <div className="flex items-center gap-2">
                        <span>{m.label}</span>
                        {cachedModels[m.id] && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {m.size}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-col gap-2">
              {llmPreset && (
                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <Info className="h-3 w-3 mt-0.5 shrink-0" />
                  {llmPreset.description}
                </p>
              )}
              <div className="flex items-center justify-between pt-1">
                {isLLMCached ? (
                  <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 gap-1 py-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Downloaded
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => loadLLM(llmModel, refreshCacheStatus)}
                  >
                    <Download className="h-3 w-3" />
                    Download Now
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-3">
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
                      <div className="flex items-center gap-2">
                        <span>{m.label}</span>
                        {cachedModels[m.id] && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {m.size}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-col gap-2">
              {sttPreset && (
                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <Info className="h-3 w-3 mt-0.5 shrink-0" />
                  {sttPreset.description}
                </p>
              )}
              <div className="flex items-center justify-between pt-1">
                {isSTTCached ? (
                  <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 gap-1 py-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Downloaded
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => loadSTT(sttModel, refreshCacheStatus)}
                  >
                    <Download className="h-3 w-3" />
                    Download Now
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-secondary/50 rounded-xl p-3 leading-relaxed mt-2">
            Models download on first use and cache in your browser. Downloads can be 75 MB – 3.2 GB
            depending on model. You will see a progress dialog during download.
          </div>
        </div>
      </main>
    </div>
  );
}
