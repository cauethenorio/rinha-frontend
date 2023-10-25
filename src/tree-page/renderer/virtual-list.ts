import { JSONLine } from 'src/types';
import { VirtualListLimitObserver } from './virtual-list-limit-observer.ts';
import { VirtualListPage } from './virtual-list-page.ts';

export class VirtualList {
  itemsPerPage = 100;
  lines: Array<JSONLine> = [];
  lastPageIndex: number = Infinity;
  pages: Array<VirtualListPage> = [];
  loadMore: null | (() => unknown) = null;

  startObserver: VirtualListLimitObserver;
  endObserver: VirtualListLimitObserver;

  constructor(private readonly root: HTMLElement) {
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
      const page = this.loadPage(prevPageIndex, false, 'start');

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
    console.log('unloaded page', page?.pageIndex);
    page?.unmount();
    this.pages.splice(index, 1);
  }

  insertPageNode = (pageEl: HTMLElement, listPosition: 'start' | 'end') => {
    if (listPosition === 'start') {
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
    listPosition: 'start' | 'end',
  ) => {
    console.log('loading page', pageIndex);

    // load more lines if there aren't enough to fill next page
    if (this.lines.length < (pageIndex + 1) * this.itemsPerPage) {
      this.loadMore?.();
    }

    const page = new VirtualListPage(
      pageIndex,
      this.getLinesForPage(pageIndex),
    );

    this.insertPageNode(page.mount(), listPosition);

    if (listPosition === 'start') {
      page.renderAllLines();
    } else {
      page.asyncRenderVisibleLines();
    }

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
        //this.pages[this.lastPageIndex].setAsFinalPage();
      }
    }

    if (this.pages.length === 0) {
      this.loadPage(0, this.lastPageIndex === 0, 'end');
    }
  }
}
