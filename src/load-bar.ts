export class LoadBar {
  el: HTMLDivElement;
  progressEl: HTMLDivElement;
  loadProgress = 0;
  constructor(private root: HTMLElement) {
    this.el = document.createElement('div');
    this.progressEl = document.createElement('div');
    this.progressEl.classList.add(
      'bg-slate-400',
      'transition-all',
      'duration-1000',
      'shadow-md',
    );
    this.el.appendChild(this.progressEl);

    this.el.classList.add(
      'opacity-50',
      'fixed',
      'w-1',
      'top-2.5',
      'right-2.5',
      'bottom-2.5',
      'border-[1px]',
      'border-slate-500',
      'rounded',
    );
    this.root.appendChild(this.el);
  }

  setLoadProgress(progress: number) {
    this.loadProgress = progress;
    this.updateProgressEl();
  }

  updateProgressEl() {
    this.progressEl.style.height = `${this.loadProgress * 100}%`;
  }
}
