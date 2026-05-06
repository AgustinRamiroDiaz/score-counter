import { TransformersJSWorkerHandler } from '@browser-ai/transformers-js';

const handler = new TransformersJSWorkerHandler();

self.onmessage = (message: MessageEvent) => {
  handler.onmessage(message);
};

export {};
