import { tree } from 'src/dom-utils';
import { ListKeyboardNavigator } from 'src/tree-page/renderer/list-keyboard-navigator';
import { JSONLine } from 'src/types';
import { VirtualListLimitObserver } from './virtual-list-limit-observer';
import { VirtualListPage } from './virtual-list-page';
import { VirtualLoadBar } from './virtual-load-bar';

export class VirtualList {
  linesPerPage = 100;
  lines: Array<JSONLine> = [];
  lastPageIndex: number = Infinity;
  pages: Array<VirtualListPage> = [];
  loadMore: null | (() => unknown) = null;
  visiblePages = new Map<number, number>();

  root?: HTMLElement;

  scrollbar: VirtualLoadBar;
  keyboardNavigator?: ListKeyboardNavigator;
  startObserver: VirtualListLimitObserver;
  endObserver: VirtualListLimitObserver;

  constructor(
    private readonly container: HTMLElement,
    private fileSize: number,
  ) {
    this.scrollbar = new VirtualLoadBar(fileSize, this.linesPerPage);
    this.startObserver = new VirtualListLimitObserver(
      this.onReachListStart,
      20,
    );
    this.endObserver = new VirtualListLimitObserver(this.onReachListEnd, 10);
  }

  public mount() {
    this.root = tree('div') as HTMLDivElement;
    this.keyboardNavigator = new ListKeyboardNavigator(
      this.root,
      this.onReachListEnd,
      this.onReachListStart,
    );
    this.container.appendChild(this.root);
  }

  public unmount() {
    this.keyboardNavigator?.unmount();
    this.scrollbar.unmount();
    this.startObserver.unmount();
    this.endObserver.unmount();
  }

  getLinesForPage(pageIndex: number) {
    return this.lines.slice(
      pageIndex * this.linesPerPage,
      (pageIndex + 1) * this.linesPerPage,
    );
  }

  onReachListStart = () => {
    if (this.pages.length > 2) {
      this.unloadPageAt(-1);
    }

    const prevPageIndex = this.pages.at(0)!.pageIndex - 1;

    if (prevPageIndex >= 0) {
      const currentScroll = window.scrollY;
      const page = this.loadPage(prevPageIndex, false, 'start').page;

      window.scrollTo({
        behavior: 'instant',
        top: currentScroll + page.el!.getBoundingClientRect().height,
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
      this.loadPage(nextPageIndex, nextPageIndex === this.lastPageIndex, 'end');
    } else {
      this.endObserver.unmount();
    }
  };

  unloadPageAt(index: number) {
    const page = this.pages.at(index);
    page?.unmount();
    this.pages.splice(index, 1);
  }

  loadInitialPage() {
    this.loadPage(0, this.lastPageIndex === 0, 'end').renderingPromise.then(
      () => {
        this.scrollbar.updatePosition(this.visiblePages);
        this.keyboardNavigator?.mount();
      },
    );
  }

  loadPage = (
    pageIndex: number,
    isLastPage: boolean,
    listPosition: 'start' | 'end',
  ): { page: VirtualListPage; renderingPromise: Promise<void> } => {
    // load more lines if there aren't enough to fill next page
    if (this.lines.length < (pageIndex + 1) * this.linesPerPage) {
      this.loadMore?.();
    }

    const page = new VirtualListPage(
      pageIndex,
      this.getLinesForPage(pageIndex),
    );

    if (listPosition === 'start') {
      this.root!.prepend(page.mount());
    } else {
      this.root!.appendChild(page.mount());
    }

    const renderingPromise = Promise.resolve(
      listPosition === 'start'
        ? page.renderAllLines()
        : page.asyncRenderVisibleLines(),
    );

    page.onScrollPositionChange = position => {
      if (position != null) {
        this.visiblePages.set(pageIndex, position);
      } else {
        this.visiblePages.delete(pageIndex);
      }
      this.scrollbar.updatePosition(this.visiblePages);
    };
    page.captureScrollPosition();

    this.pages.push(page);
    this.pages.sort((a, b) => a.pageIndex - b.pageIndex);

    if (!isLastPage && !this.endObserver.isMounted) {
      const endObserverEl = this.endObserver.mount();
      this.container.appendChild(endObserverEl);
    }

    if (this.pages[0].pageIndex > 0 && !this.startObserver.isMounted) {
      this.container.prepend(this.startObserver.mount());
    }

    return { page, renderingPromise };
  };

  appendLines(
    lines: Array<JSONLine>,
    loadMore: () => unknown,
    bytesRead: number,
  ) {
    this.lines = this.lines.concat(lines);
    this.loadMore = loadMore;
    this.scrollbar.updateLoadStats({ bytesRead, lines: this.lines.length });

    for (const page of this.pages) {
      if (page.lines.length < this.linesPerPage) {
        page.lines = this.getLinesForPage(page.pageIndex);
        page.renderVisibleLines();
      }
    }

    if (this.fileSize === bytesRead) {
      this.lastPageIndex = Math.ceil(this.lines.length / this.linesPerPage) - 1;
    }

    if (this.pages.length === 0) {
      this.loadInitialPage();
    }
  }
}
