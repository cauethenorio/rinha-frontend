import { buildLine } from './build-json-line.ts';
import { getWorkerJsonParserTransformStream } from './get-worker.ts';
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
    let isValidJsonFile = false;

    const virtualList = new VirtualList(this.treeContainerEl, buildLine);
    const loadBar = new LoadBar(this.pageEl);

    virtualList.buildLinesOnScroll();

    return await file
      .stream()
      .pipeThrough(getWorkerJsonParserTransformStream())
      .pipeTo(
        new WritableStream({
          write({ lines, processedBytes, error }) {
            if (error?.type === 'invalid-file') {
              self.reset();
              return Promise.reject(error);
            }

            return new Promise(resolve => {
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

              //lineRenderer.render(lines);

              if (lines.length > 1 && !isValidJsonFile) {
                // it there were valid JSON tokens to be parsed, we assume
                // the file is a valid JSON file
                isValidJsonFile = true;
                self.fileNameEl.textContent = fileName;
                onValidFile();
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
