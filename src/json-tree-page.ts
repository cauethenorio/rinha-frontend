import { buildLine } from './build-json-line.ts';
import { getWorkerJsonParserTransformStream } from './get-worker.ts';
import { JsonStreamChunk, ParserErrorType } from './types.ts';
import { VirtualList } from './virtual-list';
import { LoadBar } from './load-bar.ts';

export class JsonTreePage {
  prefix = 'tree-page__';
  pageEl = this.getById('page');
  treeContainerEl = this.getById('tree-container');
  fileNameEl = this.getById('filename');

  loadMore: null | ((v: unknown) => void) = null;

  async loadJsonFile(
    file: File,
    {
      onValidFile,
    }: {
      onValidFile: () => void;
    },
  ) {
    const fileName = file.name;
    const fileSize = file.size;
    //const lineRenderer = new JsonLineBuilder(this.treeContainerEl);

    const self = this;
    let readChunks = 0;

    const virtualList = new VirtualList(this.treeContainerEl, buildLine);
    const loadBar = new LoadBar(this.pageEl);

    virtualList.buildLinesOnScroll();

    return await file
      .stream()
      .pipeThrough(getWorkerJsonParserTransformStream())
      .pipeThrough(
        validateFileType({
          onValidFile: () => {
            self.fileNameEl.textContent = fileName;
            onValidFile();
          },
          onInvalidFile: error => {
            this.reset();
            throw error;
          },
        }),
      )
      .pipeTo(
        new WritableStream({
          write({ lines, processedBytes }) {
            return new Promise(resolve => {
              readChunks++;

              console.log(
                'read ',
                processedBytes,
                (processedBytes / fileSize) * 100,
                lines,
              );

              loadBar.setLoadProgress(processedBytes / fileSize);

              virtualList.appendLines(
                lines,
                // percentage read
                processedBytes / fileSize,
              );

              virtualList.setCallbackToLoadMoreLines(resolve);

              if (readChunks === 1) {
                // always load two chunks to ensure unexpected end of file
                // error are captured as they are sent in the second chunk
                resolve();
              }
            });
          },
        }),
      );
  }

  reset() {
    this.treeContainerEl.textContent = '';
    this.fileNameEl.textContent = '';
    this.loadMore = null;
  }

  // loadJsonFiles(
  //   stream: ReadableStream<JsonStreamChunk>,
  //   fileSize: number,
  //   { onValidJsonFile }: { onValidJsonFile: () => void },
  // ) {
  //   const jsonTreeInstance: JsonTreePage = this;
  //   let hasValidTokens = false;
  //
  //   const treeRenderer = new JsonTreeRenderer(this.treeContainerEl);
  //
  //   await stream.catch(err => {
  //     if (hasValidTokens) {
  //       // TODO: Handle partially malformed JSON files
  //       debugger;
  //       return;
  //     }
  //     // if there were no valid tokens, we assume the file isn't a JSON file
  //     // and let the caller catch the error and show proper message
  //     throw err;
  //   });
  // }

  getById<E extends HTMLElement>(id: string): E {
    const completeId = `${this.prefix}${id}`;
    const el = document.getElementById(completeId) as E;
    if (!el) {
      throw new Error(`Element with id '${completeId}' not found`);
    }
    return el;
  }
}

function validateFileType({
  onValidFile,
  onInvalidFile,
}: {
  onValidFile: () => unknown;
  onInvalidFile: (error: ParserErrorType) => unknown;
}) {
  let isValidJsonFile = false;

  return new TransformStream<JsonStreamChunk, JsonStreamChunk>({
    transform(chunk, controller) {
      if (chunk.error && chunk.error.type === 'invalid-file') {
        onInvalidFile(chunk.error);
        controller.terminate();
      }
      if (!isValidJsonFile && chunk.lines.length > 1) {
        // it there were valid JSON tokens to be parsed, we assume
        // the file is a valid JSON file
        isValidJsonFile = true;
        onValidFile();
      }

      controller.enqueue(chunk);
    },
  });
}
