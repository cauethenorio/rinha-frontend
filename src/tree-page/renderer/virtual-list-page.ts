import { JSONLine } from 'src/types';
import { renderLine } from './render-line';

export class VirtualListPage {
  public el?: HTMLElement;
  private renderedLines: Array<HTMLElement> = [];
  private additionalRenderHeight = 500;

  public onScrollPositionChange: null | ((position: null | number) => unknown) =
    null;

  constructor(
    public pageIndex: number,
    public lines: Array<JSONLine>,
  ) {}

  public mount() {
    this.el = document.createElement('div');
    this.el.classList.add('page', 'page' + this.pageIndex);

    window.addEventListener(
      'scroll',
      this.capturePositionAndAsyncRenderVisibleLines,
      {
        passive: true,
      },
    );

    return this.el;
  }

  public unmount() {
    window.removeEventListener(
      'scroll',
      this.capturePositionAndAsyncRenderVisibleLines,
    );
    this.onScrollPositionChange = null;
    this.el?.remove();
    this.el = undefined;
  }

  captureScrollPosition() {
    if (this.onScrollPositionChange) {
      const viewportHeight = window.innerHeight;
      const { height, top, bottom } = this.el!.getBoundingClientRect();

      if (bottom < 0 || top > viewportHeight) {
        // the page isn't visible
        return this.onScrollPositionChange(null);
      }

      // estimated total page height based on rendered lines
      const totalHeight =
        (height / this.renderedLines.length) * this.lines.length;

      const intersectionEnd = Math.min(viewportHeight - top, totalHeight);
      this.onScrollPositionChange(intersectionEnd / totalHeight);
    }
  }

  capturePositionAndAsyncRenderVisibleLines = () => {
    this.captureScrollPosition();
    this.asyncRenderVisibleLines();
  };

  asyncRenderVisibleLines = () => {
    requestAnimationFrame(this.renderVisibleLines);
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
      window.innerHeight -
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
