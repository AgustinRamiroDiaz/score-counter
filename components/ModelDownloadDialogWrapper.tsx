'use client';

import { ModelDownloadDialog } from '@/components/ModelDownloadDialog';
import { useModelDownloadStore } from '@/lib/store/modelDownloadStore';

export function ModelDownloadDialogWrapper() {
  const { open, modelId, modelType, status, progress, confirmDownload, cancelDownload, hideDialog } =
    useModelDownloadStore();

  return (
    <ModelDownloadDialog
      open={open}
      onOpenChange={(o) => !o && hideDialog()}
      modelId={modelId}
      modelType={modelType}
      status={status}
      progress={progress}
      onConfirmDownload={confirmDownload ?? undefined}
      onCancel={cancelDownload ?? undefined}
    />
  );
}
