export class VirtualScrollbar {
  private el?: HTMLDivElement;
  private progressEl?: HTMLDivElement;

  constructor(private fileSize: number) {}

  mount() {
    this.el = document.createElement('div');
    this.progressEl = document.createElement('div');
    this.progressEl.className =
      'bg-slate-400  transition-all duration-1000 shadow-md';
    this.el.appendChild(this.progressEl);

    this.el.className =
      'opacity-50 fixed w-1 top-2.5 right-2.5 bottom-2.5 border-[1px] border-slate-500 rounded';

    document.body.appendChild(this.el);
  }

  setBytesRead(bytesRead: number) {
    const loadProgress = bytesRead / this.fileSize;
    this.progressEl!.style.height = `${loadProgress * 100}%`;
  }

  unmount() {
    this.el?.remove();
    this.el = undefined;
    this.progressEl = undefined;
  }
}
