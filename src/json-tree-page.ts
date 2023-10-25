import { buildLine } from './build-json-line.ts';
import { getWorkerJsonParserTransformStream } from './get-worker.ts';
import { JSONLine, JsonStreamChunk, ParserErrorType } from './types.ts';

import { LoadBar } from './load-bar.ts';
import { VirtualListLimitObserver } from './tree-page/renderer/virtual-list-limit-observer';

class PaginatedListPage {
  pageEl: HTMLElement;
  renderedLines: Array<HTMLElement> = [];

  constructor(
    public pageIndex: number,
    insertPageNode: (pageEl: HTMLElement, index: number) => unknown,
    public lines: Array<JSONLine>,
    private readonly buildLine: (line: JSONLine) => HTMLElement,
    asyncRendering: boolean,
  ) {
    this.pageEl = document.createElement('div');
    this.pageEl.classList.add('page', 'page' + pageIndex);
    this.pageEl.style.borderBottom = '1px solid black';

    insertPageNode(this.pageEl, this.pageIndex);

    if (asyncRendering) {
      this.asyncRenderVisibleLines();
    } else {
      this.renderAllLines();
    }
    this.addScrollObserver();

    // lines.forEach(line => {
    //   this.pageEl.appendChild(this.buildLine(line));
    // });

    //this.addEndObserver();
  }

  addScrollObserver() {
    window.addEventListener('scroll', this.asyncRenderVisibleLines, {
      passive: true,
    });
  }

  public hasPendingLines() {
    return this.lines.length > this.renderedLines.length;
  }

  setAsFinalPage() {
    debugger;
  }

  asyncRenderVisibleLines = () => {
    requestAnimationFrame(this.renderVisibleLines);
  };

  renderAllLines() {
    console.log('rendering all lines of page', this.pageIndex);
    for (let i = this.renderedLines.length; i < this.lines.length; i++) {
      const line = this.lines[i];
      const lineEl = this.buildLine(line);
      this.renderedLines.push(lineEl);
      this.pageEl.appendChild(lineEl);
    }
  }

  renderVisibleLines = () => {
    if (this.renderedLines.length >= this.lines.length) {
      // nothing left to be done after all page lines are rendered
      return;
    }

    const pageRect = this.pageEl.getBoundingClientRect();
    const heightToBeFilled =
      window.innerHeight -
      (this.renderedLines.at(-1)?.getBoundingClientRect().top ?? pageRect.top) +
      240;

    //console.log('page', this.pageIndex, { heightToBeFilled });

    let filled = 0;

    for (let i = this.renderedLines.length; i < this.lines.length; i++) {
      if (filled >= heightToBeFilled) {
        break;
      }

      const line = this.lines[i];

      const lineEl = this.buildLine(line);
      this.renderedLines.push(lineEl);
      this.pageEl.appendChild(lineEl);
      //console.log('rendered line', (i + 1) * this.pageIndex);

      filled += lineEl.getBoundingClientRect().height;
    }
  };

  unload() {
    window.removeEventListener('scroll', this.asyncRenderVisibleLines);
    this.pageEl.remove();
  }
}

class PaginatedList {
  itemsPerPage = 100;
  lines: Array<JSONLine> = [];
  lastPageIndex: number = Infinity;
  pages: Array<PaginatedListPage> = [];
  loadMore: null | (() => unknown) = null;

  startObserver: VirtualListLimitObserver;
  endObserver: VirtualListLimitObserver;

  constructor(
    private readonly root: HTMLElement,
    private readonly buildLine: (line: JSONLine) => HTMLElement,
  ) {
    this.startObserver = new VirtualListLimitObserver(
      this.onReachListStart,
      20,
    );
    this.endObserver = new VirtualListLimitObserver(this.onReachListEnd, 10);
  }

  getLinesForPage(pageIndex: number) {
    return this.lines.slice(
      pageIndex * this.itemsPerPage,
      (pageIndex + 1) * this.itemsPerPage,
    );
  }

  onReachListStart = () => {
    if (this.pages.length > 2) {
      this.unloadPageAt(-1);
    }

    const prevPageIndex = this.pages.at(0)!.pageIndex - 1;

    if (prevPageIndex >= 0) {
      const currentScroll = window.scrollY;
      const page = this.loadPage(prevPageIndex, false, false);

      window.scrollTo({
        behavior: 'instant',
        top: currentScroll + page.pageEl.getBoundingClientRect().height,
      });

      if (prevPageIndex === 0) {
        this.startObserver.unmount();
      }
    }
  };

  onReachListEnd = () => {
    if (this.pages.length > 2) {
      this.unloadPageAt(0);
    }

    const nextPageIndex = this.pages.at(-1)!.pageIndex + 1;

    if (nextPageIndex <= this.lastPageIndex) {
      this.loadPage(nextPageIndex, nextPageIndex === this.lastPageIndex);
    } else {
      this.endObserver.unmount();
    }
  };

  unloadPageAt(index: number) {
    const page = this.pages.at(index);
    console.log('unloaded page', page?.pageIndex);
    page?.unload();
    this.pages.splice(index, 1);
  }

  insertPageNode = (pageEl: HTMLElement, index: number) => {
    if (index < this.pages[0]?.pageIndex ?? -1) {
      // we are adding a page at the start of the list
      this.startObserver.el?.insertAdjacentElement('afterend', pageEl);
    } else {
      if (this.endObserver.isMounted) {
        this.root.insertBefore(pageEl, this.endObserver.el);
      } else {
        this.root.appendChild(pageEl);
      }
    }
  };

  loadPage = (
    pageIndex: number,
    isLastPage: boolean,
    asyncRendering: boolean = true,
  ) => {
    console.log('loading page', pageIndex);

    // load more lines if there aren't enough to fill next page
    if (this.lines.length < (pageIndex + 1) * this.itemsPerPage) {
      this.loadMore?.();
    }

    const page = new PaginatedListPage(
      pageIndex,
      this.insertPageNode,
      this.getLinesForPage(pageIndex),
      this.buildLine,
      asyncRendering,
    );

    this.pages.push(page);
    this.pages.sort((a, b) => a.pageIndex - b.pageIndex);

    if (!isLastPage && !this.endObserver.isMounted) {
      const endObserverEl = this.endObserver.mount();
      this.root.appendChild(endObserverEl);
    }

    if (this.pages[0].pageIndex > 0 && !this.startObserver.isMounted) {
      console.log('added');
      this.root.prepend(this.startObserver.mount());
    }

    return page;
  };

  appendLines(
    lines: Array<JSONLine>,
    loadMore: () => unknown,
    finished: boolean,
  ) {
    this.lines = this.lines.concat(lines);
    this.loadMore = loadMore;

    for (const page of this.pages) {
      if (page.lines.length < this.itemsPerPage) {
        page.lines = this.getLinesForPage(page.pageIndex);
        page.renderVisibleLines();
      }
    }

    if (finished) {
      console.log('finished loading');
      this.lastPageIndex = Math.ceil(this.lines.length / this.itemsPerPage) - 1;

      if (this.pages.length >= this.lastPageIndex) {
        this.pages[this.lastPageIndex].setAsFinalPage();
      }
    }

    if (this.pages.length === 0) {
      this.loadPage(0, this.lastPageIndex === 0);
    }
  }
}

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

    const virtualList = new PaginatedList(this.treeContainerEl, buildLine);
    const loadBar = new LoadBar(this.pageEl);

    //virtualList.loadPage(0);

    //virtualList.buildLinesOnScroll();

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
  }

  reset() {
    this.treeContainerEl.textContent = '';
    this.fileNameEl.textContent = '';
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
