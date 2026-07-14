'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { LLM_MODELS, STT_MODELS, getModelPreset, isModelCached } from '@/lib/config/models';
import { useLLM } from '@/lib/ai/useLLM';
import { useSTT } from '@/lib/ai/useSTT';
import {
  chooseMediaPipeModelFile,
  isMediaPipeModelFile,
  saveFallbackMediaPipeFile,
  supportsFileSystemModelPicker,
} from '@/lib/ai/mediapipeModelFile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Bot, Mic, HardDrive, Info, CheckCircle2, Download, Upload, Server } from 'lucide-react';
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
  const {
    sttModel,
    llmModel,
    llmBackend,
    ollamaUrl,
    ollamaModel,
    mediapipeModel,
    setSTTModel,
    setLLMModel,
    setLLMBackend,
    setOllamaUrl,
    setOllamaModel,
    setMediaPipeModel,
  } = useSettingsStore();
  const { load: loadLLM } = useLLM();
  const { load: loadSTT } = useSTT();
  const fallbackInputRef = useRef<HTMLInputElement>(null);

  const [cachedModels, setCachedModels] = useState<Record<string, boolean>>({});
  const [mediaPipeError, setMediaPipeError] = useState<string | null>(null);
  const transformersModels = useMemo(() => LLM_MODELS.filter((m) => m.backend !== 'mediapipe'), []);

  const refreshCacheStatus = useCallback(async () => {
    const status: Record<string, boolean> = {};
    const allModels = [...transformersModels, ...STT_MODELS];
    await Promise.all(
      allModels.map(async (m) => {
        status[m.id] = await isModelCached(m.id);
      }),
    );
    setCachedModels(status);
  }, [transformersModels]);

  useEffect(() => {
    let mounted = true;

    async function check() {
      const status: Record<string, boolean> = {};
      const allModels = [...transformersModels, ...STT_MODELS];
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
  }, [transformersModels]);

  useEffect(() => {
    if (llmBackend === 'transformers' && !transformersModels.some((m) => m.id === llmModel)) {
      setLLMModel(transformersModels[0]?.id ?? llmModel);
    }
  }, [llmBackend, llmModel, setLLMModel, transformersModels]);

  const llmPreset = getModelPreset(llmModel, 'llm');
  const sttPreset = getModelPreset(sttModel, 'stt');

  const isLLMCached = cachedModels[llmModel];
  const isSTTCached = cachedModels[sttModel];
  const canRememberMediaPipeFile = supportsFileSystemModelPicker();

  const selectMediaPipeFile = useCallback(async () => {
    setMediaPipeError(null);
    if (!canRememberMediaPipeFile) {
      fallbackInputRef.current?.click();
      return;
    }

    try {
      const { metadata } = await chooseMediaPipeModelFile();
      setMediaPipeModel(metadata);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setMediaPipeError(err instanceof Error ? err.message : 'Could not select the model file.');
    }
  }, [canRememberMediaPipeFile, setMediaPipeModel]);

  const onFallbackFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      setMediaPipeError(null);
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;

      if (!isMediaPipeModelFile(file)) {
        setMediaPipeError('Select a Web-compatible Gemma .litertlm or .task file.');
        return;
      }

      const metadata = await saveFallbackMediaPipeFile(file);
      setMediaPipeModel(metadata);
    },
    [setMediaPipeModel],
  );

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  };

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
            <Label htmlFor="llm-backend" className="flex items-center gap-2">
              <Bot className="h-3.5 w-3.5 text-ai" />
              LLM Backend
            </Label>
            <Select
              value={llmBackend}
              onValueChange={(v: string | null) => {
                if (v === 'mediapipe' || v === 'ollama' || v === 'transformers') setLLMBackend(v);
              }}
            >
              <SelectTrigger id="llm-backend" className="h-11 bg-secondary border-transparent">
                <SelectValue placeholder="Select a backend" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transformers">Transformers.js</SelectItem>
                <SelectItem value="mediapipe">MediaPipe</SelectItem>
                <SelectItem value="ollama">Ollama</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {llmBackend === 'transformers' ? (
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
                  {transformersModels.map((m) => (
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
          ) : llmBackend === 'mediapipe' ? (
            <div className="flex flex-col gap-3">
              <Label className="flex items-center gap-2">
                <HardDrive className="h-3.5 w-3.5 text-ai" />
                Local Gemma Model
              </Label>
              <input
                ref={fallbackInputRef}
                type="file"
                accept=".litertlm,.task"
                className="hidden"
                onChange={onFallbackFileChange}
              />
              <div className="rounded-xl bg-secondary/50 p-3 flex flex-col gap-3">
                {mediapipeModel ? (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{mediapipeModel.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(mediapipeModel.size)} ·{' '}
                        {mediapipeModel.handleAvailable ? 'Remembered file handle' : 'Reselect after refresh'}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 gap-1 py-1 shrink-0">
                      <CheckCircle2 className="h-3 w-3" />
                      Selected
                    </Badge>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Select a Web-compatible Gemma <span className="font-medium">.litertlm</span> or{' '}
                    <span className="font-medium">.task</span> file. The file stays on this device.
                  </p>
                )}
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs self-start" onClick={selectMediaPipeFile}>
                  <Upload className="h-3 w-3" />
                  {mediapipeModel ? 'Change File' : 'Select File'}
                </Button>
                {mediaPipeError && <p className="text-xs text-destructive">{mediaPipeError}</p>}
              </div>
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                MediaPipe runs local Gemma models with WebGPU. Chromium can remember the file handle;
                other browsers may ask you to reselect the file.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Label htmlFor="ollama-url" className="flex items-center gap-2">
                <Server className="h-3.5 w-3.5 text-ai" />
                Ollama Server
              </Label>
              <Input
                id="ollama-url"
                value={ollamaUrl}
                onChange={(event) => setOllamaUrl(event.target.value)}
                placeholder="http://localhost:11434"
                className="h-11 bg-secondary border-transparent"
              />
              <Label htmlFor="ollama-model" className="flex items-center gap-2">
                <Bot className="h-3.5 w-3.5 text-ai" />
                Ollama Model
              </Label>
              <Input
                id="ollama-model"
                value={ollamaModel}
                onChange={(event) => setOllamaModel(event.target.value)}
                placeholder="llama3.2"
                className="h-11 bg-secondary border-transparent"
              />
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                Start Ollama locally and pull the model first, for example: ollama pull {ollamaModel || 'llama3.2'}.
              </p>
            </div>
          )}

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
            Transformers models download on first use and cache in your browser. MediaPipe models
            are selected from your local filesystem. Ollama requests go directly from this browser
            to your configured local server.
          </div>
        </div>
      </main>
    </div>
  );
}
