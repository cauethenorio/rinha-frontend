import { JSONLine } from 'src/types';
import { renderLine } from './render-line';

export class VirtualListPage {
  public el?: HTMLElement;
  private renderedLines: Array<HTMLElement> = [];
  private additionalRenderHeight = 500;

  public onScrollPositionChange: null | ((position: null | number) => unknown) =
    null;

  constructor(
    private scrollable: HTMLElement,
    public pageIndex: number,
    public lines: Array<JSONLine>,
  ) {}

  public mount() {
    this.el = document.createElement('div');
    this.el.classList.add('page', 'page' + this.pageIndex);

    this.scrollable.addEventListener(
      'scroll',
      this.capturePositionAndAsyncRenderVisibleLines,
      {
        passive: true,
      },
    );

    return this.el;
  }

  public unmount() {
    this.scrollable.removeEventListener(
      'scroll',
      this.capturePositionAndAsyncRenderVisibleLines,
    );
    this.onScrollPositionChange = null;
    this.el?.remove();
    this.el = undefined;
  }

  captureScrollPosition() {
    if (this.onScrollPositionChange) {
      const scrollableHeight = this.scrollable.clientHeight;
      const { height, top, bottom } = this.el!.getBoundingClientRect();

      if (bottom < 0 || top > scrollableHeight) {
        // the page isn't visible
        return this.onScrollPositionChange(null);
      }

      // estimated total page height based on rendered lines
      const totalHeight =
        (height / this.renderedLines.length) * this.lines.length;

      const intersectionEnd = Math.min(scrollableHeight - top, totalHeight);
      this.onScrollPositionChange(intersectionEnd / totalHeight);
    }
  }

  capturePositionAndAsyncRenderVisibleLines = () => {
    this.captureScrollPosition();
    return this.asyncRenderVisibleLines();
  };

  asyncRenderVisibleLines = () => {
    return new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        this.renderVisibleLines();
        resolve();
      });
    });
  };

  renderAllLines() {
    for (let i = this.renderedLines.length; i < this.lines.length; i++) {
      const line = this.lines[i];
      const lineEl = renderLine(line);
      this.renderedLines.push(lineEl);
      this.el!.appendChild(lineEl);
    }
  }

  renderVisibleLines = () => {
    if (this.renderedLines.length >= this.lines.length) {
      return;
    }

    const pageRect = this.el!.getBoundingClientRect();
    const heightToBeFilled =
      this.scrollable.scrollHeight -
      (this.renderedLines.at(-1)?.getBoundingClientRect().top ?? pageRect.top) +
      this.additionalRenderHeight;

    let renderedHeight = 0;

    for (let i = this.renderedLines.length; i < this.lines.length; i++) {
      if (renderedHeight >= heightToBeFilled) {
        break;
      }

      const line = this.lines[i];

      const lineEl = renderLine(line);
      this.renderedLines.push(lineEl);
      this.el!.appendChild(lineEl);

      renderedHeight += lineEl.getBoundingClientRect().height;
    }
  };
}
