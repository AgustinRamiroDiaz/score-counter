'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { HardDrive, Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getModelPreset } from '@/lib/config/models';

interface ModelDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelId: string;
  modelType: 'llm' | 'stt';
  status: string;
  progress?: number;
  onConfirmDownload?: () => void;
  onCancel?: () => void;
}

export function ModelDownloadDialog({
  open,
  onOpenChange,
  modelId,
  modelType,
  status,
  progress,
  onConfirmDownload,
  onCancel,
}: ModelDownloadDialogProps) {
  const preset = getModelPreset(modelId, modelType);
  const [showWarning, setShowWarning] = useState(true);

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (newOpen) {
      setShowWarning(true);
    }
  };

  const isDownloading = status !== 'idle' && status !== 'ready' && status !== 'error';
  const isDone = status === 'ready' || status === 'Model ready' || status === 'STT model ready';
  const isError = status === 'error';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-ai" />
            {isDone ? 'Model Ready' : isDownloading ? 'Downloading Model' : 'Download Model'}
          </DialogTitle>
          <DialogDescription>
            {preset?.label ?? modelId} — {preset?.size ?? 'Unknown size'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {showWarning && !isDownloading && !isDone && (
            <div className="rounded-xl bg-secondary/50 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm">
                  This model will download ~{preset?.size ?? 'unknown amount'} of data from Hugging
                  Face CDN. The download will be cached in your browser for future use.
                </p>
              </div>
              {preset && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <HardDrive className="h-3 w-3" />
                  {preset.description}
                </p>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button onClick={onConfirmDownload}>Download</Button>
              </div>
            </div>
          )}

          {(isDownloading || isDone || isError) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{status}</span>
                {progress !== undefined && (
                  <span className="text-muted-foreground">{Math.round(progress * 100)}%</span>
                )}
              </div>
              <Progress value={progress !== undefined ? progress * 100 : null} />
              {isDone && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Model loaded and ready!
                </div>
              )}
              {isError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Failed to load model. Please try again.
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
