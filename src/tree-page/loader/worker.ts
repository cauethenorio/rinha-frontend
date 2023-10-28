import { fromReadablePort, fromWritablePort } from 'remote-web-streams';
import { JsonTokens2Lines } from './tokens-to-lines';

import type { JsonStreamChunk } from 'src/types';

type StreamStats = {
  processedBytes: number;
};

self.onmessage = async event => {
  // create the input and output streams from the transferred ports
  const { readablePort, writablePort } = event.data;
  const readable = fromReadablePort(readablePort);
  const writable = fromWritablePort(writablePort);

  const streamStats: StreamStats = { processedBytes: 0 };

  // process data
  await readable
    .pipeThrough(limitChunkSizeStream(10000))
    .pipeThrough(addStreamStatsToChunkStream(streamStats))
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(parseJsonStream(streamStats))
    .pipeTo(writable);
};

function parseJsonStream(stats: StreamStats) {
  const tokensToLines = new JsonTokens2Lines();

  return new TransformStream<string, JsonStreamChunk>({
    transform(chunk, controller) {
      const { lines, error } = tokensToLines.convertChunk(chunk);

      controller.enqueue({ lines, error, stats } as JsonStreamChunk);

      if (error) {
        controller.terminate();
      }
    },

    flush(controller) {
      const { lines, error } = tokensToLines.end();

      // capture unexpected end of file errors
      if (lines.length) {
        controller.enqueue({ lines, error, stats } as JsonStreamChunk);
      }

      if (error) {
        controller.terminate();
      }
    },
  });
}

function addStreamStatsToChunkStream(stats: StreamStats) {
  return new TransformStream({
    transform(chunk, controller) {
      stats.processedBytes += chunk.length;
      controller.enqueue(chunk);
    },
  });
}

function limitChunkSizeStream(maxChunkSize: number) {
  return new TransformStream({
    transform(chunk, controller) {
      for (let i = 0; i < chunk.length; i += maxChunkSize) {
        controller.enqueue(chunk.slice(i, i + maxChunkSize));
      }
    },
  });
}
