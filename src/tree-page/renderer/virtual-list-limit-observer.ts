import { JSONLineType } from 'src/types';
import { renderLine } from './render-line';

export class VirtualListLimitObserver {
  private maxLevel = 4;

  public el: HTMLDivElement | null = null;
  observer?: IntersectionObserver;
  public isMounted = false;

  constructor(
    private onIntersect: () => void,
    private numLines: number = 10,
  ) {}

  mount() {
    this.el = document.createElement('div');
    this.appendLoadingLines();

    this.observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        this.onIntersect();
      }
    }, {});

    this.observer.observe(this.el);
    this.isMounted = true;
    return this.el;
  }

  unmount() {
    this.observer?.disconnect();
    this.el?.remove();
    this.el = null;
    this.isMounted = false;
  }

  private appendLoadingLines() {
    let level = this.getRandomLevel();
    for (let i = 0; i < this.numLines; i++) {
      this.el?.appendChild(
        renderLine({
          type: JSONLineType.Loading,
          level,
          width: this.getRandomBetween(20, 80),
        }),
      );
      level = this.getRandomLevel(level);
    }
  }

  private getRandomLevel(prevLevel?: number) {
    let level = prevLevel ?? this.getRandomBetween(0, this.maxLevel);
    const rand = Math.random();

    if (prevLevel != null) {
      if (rand < 0.25) {
        level--;
      } else if (rand > 0.75) {
        level++;
      }
    }

    return Math.min(Math.max(level, 0), this.maxLevel);
  }

  private getRandomBetween(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
}
