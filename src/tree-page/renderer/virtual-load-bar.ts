import { namedTree } from 'src/dom-utils';

export class VirtualLoadBar {
  private el?: HTMLDivElement;
  private progressEl?: HTMLDivElement;
  private positionEl?: HTMLDivElement;
  private isMounted = false;

  totalPages?: number;

  constructor(
    private fileSize: number,
    private linesPerPage: number,
  ) {}

  mount() {
    const { container, progress, position } = namedTree<{
      container: HTMLDivElement;
      progress: HTMLDivElement;
      position: HTMLDivElement;
    }>(t =>
      t(
        'div!container',
        {
          class:
            'opacity-50 fixed w-0.5 top-4 right-4 bottom-4 ring-[1px] ring-slate-500 rounded transition duration-500 delay-500 translate-x-5',
        },
        [
          t(
            'div!progress',
            { class: 'bg-slate-400 transition-all duration-1000 shadow-md' },
            [],
          ),
          t('div!position', {
            class:
              'top-0 left-1/2 absolute rounded-full w-2 h-2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-200 ring-[1.5px] ring-slate-600 transition-all duration-100',
          }),
        ],
      ),
    );

    this.el = container;
    this.progressEl = progress;
    this.positionEl = position;
    this.isMounted = true;

    document.body.appendChild(this.el);
    requestAnimationFrame(() => this.el?.classList.remove('translate-x-5'));
  }

  updateLoadStats({ bytesRead, lines }: { bytesRead: number; lines: number }) {
    const loadProgress = bytesRead / this.fileSize;
    const totalPages = Math.ceil(lines / loadProgress / this.linesPerPage);

    if (this.totalPages === undefined && totalPages > 1) {
      this.mount();
    }

    if (this.isMounted) {
      this.progressEl!.style.height = `${loadProgress * 100}%`;
    }

    this.totalPages = totalPages;
  }

  updatePosition(visiblePages: Map<number, number>) {
    if (this.isMounted) {
      const totalPages = this.totalPages!;
      const lastVisiblePageIndex = Math.max(...visiblePages.keys());
      let position = Math.max(lastVisiblePageIndex / totalPages, 0);

      position += visiblePages.get(lastVisiblePageIndex)! / totalPages;

      // const position =
      //   Math.max(...visiblePages) - Math.min(...visiblePages) / totalPages;
      this.positionEl!.style.top = `${position * 100}%`;
    }
  }

  unmount() {
    this.el?.remove();
    this.el = undefined;
    this.progressEl = undefined;
    this.isMounted = false;
  }
}
