import { RemoteReadableStream, RemoteWritableStream } from 'remote-web-streams';

import ParserWorker from './worker.ts?worker';
import type { JsonStreamChunk } from 'src/types';

export function getWorkerJsonParserTransformStream(): {
  readable: ReadableStream<JsonStreamChunk>;
  writable: WritableStream<Uint8Array>;
} {
  const worker = new ParserWorker();

  const { writable, readablePort } = new RemoteWritableStream({
    // https://github.com/MattiasBuelens/remote-web-streams/issues/24
    transferChunk(chunk) {
      if (chunk instanceof Uint8Array) {
        return [chunk.buffer];
      }
      return [];
    },
  });
  const { readable, writablePort } = new RemoteReadableStream();

  worker.postMessage({ readablePort, writablePort }, [
    readablePort,
    writablePort,
  ]);

  return { readable, writable };
}
