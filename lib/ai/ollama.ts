'use client';

export interface OllamaModelTag {
  name: string;
  size?: number;
  modifiedAt?: string;
  parameterSize?: string;
  quantizationLevel?: string;
}

interface OllamaTagsResponse {
  models: OllamaModelTag[];
}

interface OllamaRawModel {
  name?: unknown;
  model?: unknown;
  size?: unknown;
  modified_at?: unknown;
  details?: {
    parameter_size?: unknown;
    quantization_level?: unknown;
  };
}

export function normalizeOllamaUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  return trimmed.length > 0 ? trimmed : 'http://localhost:11434';
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function isRawModel(value: unknown): value is OllamaRawModel {
  return typeof value === 'object' && value !== null;
}

function parseModel(value: unknown): OllamaModelTag | null {
  if (!isRawModel(value)) return null;

  const name = stringValue(value.name) ?? stringValue(value.model);
  if (!name) return null;

  return {
    name,
    size: numberValue(value.size),
    modifiedAt: stringValue(value.modified_at),
    parameterSize: stringValue(value.details?.parameter_size),
    quantizationLevel: stringValue(value.details?.quantization_level),
  };
}

export async function fetchOllamaModels(ollamaUrl: string): Promise<OllamaTagsResponse> {
  const response = await fetch(`${normalizeOllamaUrl(ollamaUrl)}/api/tags`);
  if (!response.ok) {
    throw new Error(`Ollama returned ${response.status}`);
  }

  const data: unknown = await response.json();
  const rawModels =
    typeof data === 'object' && data !== null && Array.isArray((data as { models?: unknown }).models)
      ? (data as { models: unknown[] }).models
      : [];

  return {
    models: rawModels
      .map(parseModel)
      .filter((model): model is OllamaModelTag => model !== null)
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}
