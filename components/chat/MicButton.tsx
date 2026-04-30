'use client';

import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useSTT } from '@/lib/ai/useSTT';
import { cn } from '@/lib/utils';

interface Props {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function MicButton({ onTranscript, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { transcribe, sttStatus } = useSTT();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const arrayBuffer = await blob.arrayBuffer();
        const audioCtx = new AudioContext({ sampleRate: 16000 });
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        transcribe(audioBuffer.getChannelData(0), audioBuffer.sampleRate, {
          onTranscript,
          onError: (msg) => console.error('STT error:', msg),
        });
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      console.error('Mic access denied:', err);
    }
  }, [transcribe, onTranscript]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

  const isLoading = sttStatus.loading;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        'h-10 w-10 shrink-0 rounded-xl transition-all',
        recording
          ? 'bg-destructive/20 text-destructive animate-pulse'
          : 'text-muted-foreground hover:text-ai hover:bg-ai/10',
      )}
      onClick={recording ? stopRecording : startRecording}
      disabled={disabled || isLoading}
      aria-label={recording ? 'Stop recording' : 'Start voice input'}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : recording ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
}
