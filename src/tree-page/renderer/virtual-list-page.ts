import { JSONLine } from 'src/types';
import { renderLine } from './render-line';

export class VirtualListPage {
  public el?: HTMLElement;
  private renderedLines: Array<HTMLElement> = [];
  private additionalRenderHeight = 500;

  constructor(
    public pageIndex: number,
    public lines: Array<JSONLine>,
  ) {}

  public mount() {
    this.el = document.createElement('div');
    this.el.classList.add('page', 'page' + this.pageIndex);
    this.el.style.borderBottom = '1px solid black';

    window.addEventListener('scroll', this.asyncRenderVisibleLines, {
      passive: true,
    });

    return this.el;
  }

  public unmount() {
    window.removeEventListener('scroll', this.asyncRenderVisibleLines);
    this.el?.remove();
    this.el = undefined;
  }

  // public hasPendingLines() {
  //   debugger;
  //   return this.lines.length > this.renderedLines.length;
  // }
  //
  // setAsFinalPage() {
  //   debugger;
  // }

  asyncRenderVisibleLines = () => {
    requestAnimationFrame(this.renderVisibleLines);
  };

  renderAllLines() {
    console.log('rendering all lines of page', this.pageIndex);
    for (let i = this.renderedLines.length; i < this.lines.length; i++) {
      const line = this.lines[i];
      const lineEl = renderLine(line);
      this.renderedLines.push(lineEl);
      this.el!.appendChild(lineEl);
    }
  }

  renderVisibleLines = () => {
    if (this.renderedLines.length >= this.lines.length) {
      // nothing left to be done after all page lines are rendered
      return;
    }

    const pageRect = this.el!.getBoundingClientRect();
    const heightToBeFilled =
      window.innerHeight -
      (this.renderedLines.at(-1)?.getBoundingClientRect().top ?? pageRect.top) +
      this.additionalRenderHeight;

    let filled = 0;

    for (let i = this.renderedLines.length; i < this.lines.length; i++) {
      if (filled >= heightToBeFilled) {
        break;
      }

      const line = this.lines[i];

      const lineEl = renderLine(line);
      this.renderedLines.push(lineEl);
      this.el!.appendChild(lineEl);

      filled += lineEl.getBoundingClientRect().height;
    }
  };
}
