'use client';

import type { MediaPipeModelMetadata } from '@/lib/types';

const DB_NAME = 'score-counter-mediapipe-model';
const STORE_NAME = 'handles';
const HANDLE_KEY = 'gemma-model';
const ACCEPTED_EXTENSIONS = ['.litertlm', '.task'] as const;
let sessionFile: File | null = null;

type FilePickerWindow = Window &
  typeof globalThis & {
    showOpenFilePicker?: (options?: {
      multiple?: boolean;
      excludeAcceptAllOption?: boolean;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<FileSystemFileHandle[]>;
  };

type FilePermissionHandle = FileSystemFileHandle & {
  queryPermission: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
  requestPermission: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(value, key);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(key);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export function isMediaPipeModelFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
}

export function mediaPipeModelMetadata(file: File, handleAvailable: boolean): MediaPipeModelMetadata {
  return {
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    handleAvailable,
  };
}

export function supportsFileSystemModelPicker(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
}

export async function chooseMediaPipeModelFile(): Promise<{
  file: File;
  metadata: MediaPipeModelMetadata;
}> {
  const pickerWindow = window as FilePickerWindow;
  if (!pickerWindow.showOpenFilePicker) {
    throw new Error('File picker handles are not supported in this browser.');
  }

  const [handle] = await pickerWindow.showOpenFilePicker({
    multiple: false,
    excludeAcceptAllOption: true,
    types: [
      {
        description: 'MediaPipe Gemma model',
        accept: {
          'application/octet-stream': [...ACCEPTED_EXTENSIONS],
        },
      },
    ],
  });

  const file = await handle.getFile();
  if (!isMediaPipeModelFile(file)) {
    throw new Error('Select a Web-compatible Gemma .litertlm or .task file.');
  }

  sessionFile = file;
  await idbSet(HANDLE_KEY, handle);
  return { file, metadata: mediaPipeModelMetadata(file, true) };
}

export async function saveFallbackMediaPipeFile(file: File): Promise<MediaPipeModelMetadata> {
  sessionFile = file;
  await idbDelete(HANDLE_KEY);
  return mediaPipeModelMetadata(file, false);
}

export async function getRememberedMediaPipeModelFile(): Promise<File | null> {
  if (sessionFile) return sessionFile;

  const handle = await idbGet<FilePermissionHandle>(HANDLE_KEY);
  if (!handle) return null;

  const permission = await handle.queryPermission({ mode: 'read' });
  const granted = permission === 'granted' ? permission : await handle.requestPermission({ mode: 'read' });
  if (granted !== 'granted') return null;

  const file = await handle.getFile();
  if (!isMediaPipeModelFile(file)) return null;

  sessionFile = file;
  return file;
}

export async function clearRememberedMediaPipeModelFile(): Promise<void> {
  sessionFile = null;
  await idbDelete(HANDLE_KEY);
}
