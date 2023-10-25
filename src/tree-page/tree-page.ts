import { getWorkerJsonParserTransformStream } from '../get-worker.ts';
import { JsonStreamChunk, ParserErrorType } from 'src/types';

//import { LoadBar } from '../load-bar.ts';
import { VirtualList } from './renderer/virtual-list';

export class TreePage {
  prefix = 'tree-page__';

  els = {
    page: this.getById('page'),
    treeContainer: this.getById('tree-container'),
    fileName: this.getById('filename'),
  };

  loadMore: null | ((v: unknown) => void) = null;

  async loadJsonFile(file: File) {
    return new Promise<void>((resolve, reject) => {
      const fileName = file.name;
      const fileSize = file.size;

      let readChunks = 0;

      const virtualList = new VirtualList(this.els.treeContainer);
      //const loadBar = new LoadBar(this.els.page);

      file
        .stream()
        .pipeThrough(getWorkerJsonParserTransformStream())
        .pipeThrough(
          validateFileType({
            onValidFile: () => {
              this.show(fileName);
              resolve();
            },
            onInvalidFile: error => {
              this.hide();
              reject(error);
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

                //loadBar.setLoadProgress(processedBytes / fileSize);
                const percentageRead = processedBytes / fileSize;

                virtualList.appendLines(
                  lines,
                  resolve,
                  // percentage read
                  percentageRead === 1,
                );

                //virtualList.setCallbackToLoadMoreLines(resolve);

                if (percentageRead === 1) {
                  // always load two chunks to ensure unexpected end of file
                  // error are captured as they are sent in the second chunk
                  resolve();
                }
              });
            },
          }),
        );
    });
  }

  show(filename: string) {
    this.els.fileName.textContent = filename;
    //this.els.page.classList.remove('hidden');
    requestAnimationFrame(() => {
      this.els.page.classList.replace('opacity-0', 'opacity-100');
      this.els.page.classList.remove('translate-x-10');
    });
  }

  hide() {
    this.els.page.classList.add('hidden');
    this.els.treeContainer.textContent = '';
    this.els.fileName.textContent = '';
    this.loadMore = null;
  }

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
