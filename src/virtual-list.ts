/*
  Listen to scroll events on the target element
  and calculate the number of items which are visible
  in the current viewport
 
 */

export class VirtualList<L> {
  lineHeight: number = 28;
  expectedTotalLines: number = 0;
  extraLinesBefore = 0; //10;
  extraLinesAfter = 0; //100;

  linePosition = new Map<number, number>();
  builtLines = new Map<number, HTMLElement>();
  lines: Array<L> = [];

  externalLoadMoreCallback: null | (() => unknown) = null;
  needsMoreLines = false;

  constructor(
    private target: HTMLElement,
    private lineBuilder: (line: L) => HTMLElement,
  ) {}

  appendLines(lines: Array<L>, percentageRead: number) {
    this.lines = this.lines.concat(lines);

    const expectedTotalLines = Math.floor(this.lines.length / percentageRead);

    console.log('appendLines', {
      percentageRead,
      expectedTotalLines,
      lines: this.lines.length,
    });

    if (expectedTotalLines != this.expectedTotalLines) {
      this.expectedTotalLines = expectedTotalLines;
      this.target.style.height = `${
        this.expectedTotalLines * this.lineHeight
      }px`;
    }

    this.buildVisibleLines();
  }

  buildVisibleLines = () => {
    requestAnimationFrame(() => {
      const [indexStart, indexEnd] = this.getVisibleLinesRange();
      this.needsMoreLines = false;

      const visibleLines = new Set();

      for (let i = indexStart; i < indexEnd; i += 1) {
        visibleLines.add(i);
        if (!this.builtLines.has(i)) {
          const line = this.lines[i];
          if (line) {
            const el = this.lineBuilder(line);

            const topPosition = this.linePosition.get(i) ?? 0;

            el.style.top = `${topPosition}px`;
            this.target.appendChild(el);

            this.linePosition.set(
              i + 1,
              topPosition + el.getBoundingClientRect().height,
            );

            this.builtLines.set(i, el);
          } else {
            this.needsMoreLines = true;
          }
        }
      }

      for (const [index, el] of this.builtLines.entries()) {
        if (!visibleLines.has(index)) {
          el.remove();
          this.builtLines.delete(index);
        }
      }

      if (this.needsMoreLines) {
        this.loadMoreLines();
      }
    });
  };

  setCallbackToLoadMoreLines(externalLoadMoreCallback: () => unknown) {
    this.externalLoadMoreCallback = externalLoadMoreCallback;
    if (this.needsMoreLines) {
      this.externalLoadMoreCallback();
      this.needsMoreLines = false;
    }
  }

  loadMoreLines() {
    console.log('load more');
    if (this.externalLoadMoreCallback) {
      this.externalLoadMoreCallback();
    } else {
      this.needsMoreLines = true;
    }
  }

  getVisibleLinesRange(): [number, number] {
    const rect = this.target.getBoundingClientRect();
    const start = Math.min(rect.height, Math.max(0, -rect.top));
    const end = Math.max(0, -rect.top + window.innerHeight);

    // calculate the range of visible lines in the viewPort
    const indexStart = Math.max(
      0,
      Math.min(
        this.expectedTotalLines,
        Math.floor(start / this.lineHeight) - this.extraLinesBefore,
      ),
    );

    const indexEnd = Math.min(
      this.expectedTotalLines,
      Math.max(0, Math.floor(end / this.lineHeight) + this.extraLinesAfter),
    );

    return [indexStart, indexEnd];
  }

  buildLinesOnScroll() {
    window.addEventListener('scroll', this.buildVisibleLines, {
      passive: true,
    });
  }
}
