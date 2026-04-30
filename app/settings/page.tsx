'use client';

import { useRouter } from 'next/navigation';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { sttModel, llmModel, setSTTModel, setLLMModel } = useSettingsStore();

  return (
    <div className="min-h-dvh flex flex-col max-w-lg mx-auto">
      <header className="flex items-center gap-2 px-2 py-2 border-b">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold text-lg">Settings</h1>
      </header>

      <main className="flex-1 px-4 py-5 flex flex-col gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">AI Models</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="llm-model">Language Model (LLM)</Label>
              <Input
                id="llm-model"
                value={llmModel}
                onChange={(e) => setLLMModel(e.target.value)}
                placeholder="HuggingFaceTB/SmolLM3-3B"
              />
              <p className="text-xs text-muted-foreground">
                Hugging Face model ID for chat & tool calling. Runs in-browser.
              </p>
            </div>

            <Separator />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stt-model">Speech-to-Text Model (STT)</Label>
              <Input
                id="stt-model"
                value={sttModel}
                onChange={(e) => setSTTModel(e.target.value)}
                placeholder="openai/whisper-base"
              />
              <p className="text-xs text-muted-foreground">
                Hugging Face model ID for voice transcription. Runs in-browser.
              </p>
            </div>

            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 leading-relaxed">
              Models are downloaded on first use and cached in your browser. Larger models
              may take a few minutes to load and require 2–4 GB of RAM.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
