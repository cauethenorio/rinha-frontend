import { fromReadablePort, fromWritablePort } from 'remote-web-streams';
import { JsonStreamChunk } from './types';
import { JsonTokens2Lines } from './parser/tokens-to-lines';

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

      // break lines in chunks of 55 items
      // const chunkSize = 223;
      // for (let i = 0; i < lines.length; i += chunkSize) {
      //   controller.enqueue({
      //     lines: lines.slice(i, i + chunkSize),
      //     error: null,
      //     processedBytes: stats.processedBytes,
      //   } as JsonStreamChunk);
      // }

      controller.enqueue({
        lines,
        error,
        processedBytes: stats.processedBytes,
      } as JsonStreamChunk);

      if (error) {
        controller.terminate();
      }
    },

    flush(controller) {
      const { lines, error } = tokensToLines.end();

      // capture unexpected end of file errors
      if (lines.length) {
        controller.enqueue({
          lines,
          error,
          processedBytes: stats.processedBytes,
        } as JsonStreamChunk);
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
