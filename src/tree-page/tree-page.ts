import { getWorkerJsonParserTransformStream } from './loader/get-worker.ts';
import { validateJsonType } from './loader/validate-json-type';

import { VirtualList } from './renderer/virtual-list';
import { namedTree } from 'src/dom-utils';

export class TreePage {
  private virtualList?: VirtualList;

  els: {
    page: HTMLDivElement;
    listContainer: HTMLDivElement;
    title: HTMLHeadingElement;
  } | null = null;

  loadMore: null | ((v: unknown) => void) = null;

  mount(file: File) {
    this.els = namedTree<{
      page: HTMLDivElement;
      listContainer: HTMLDivElement;
      title: HTMLHeadingElement;
    }>(t =>
      t(
        'div!page',
        {
          class:
            'absolute top-0 end-0 bottom-0 start-0 ' +
            'py-6 px-3 translate-x-10 opacity-0 transition duration-500 ' +
            'delay-200 overflow-auto',
        },
        t('div', { class: 'container max-w-5xl mx-auto' }, [
          t('h1!title', { class: 'text-[32px] font-bold' }),
          t('ul!listContainer', {
            class: 'relative text-base leading-7 pt-[10px]',
            role: 'group',
          }),
        ]),
      ),
    );
    this.els.title.textContent = file.name;
    document.getElementById('app')!.appendChild(this.els.page);

    this.virtualList = new VirtualList(
      this.els.page,
      this.els.listContainer,
      file.size,
    );
    this.virtualList.mount();
  }

  display() {
    requestAnimationFrame(() => {
      this.els!.page.classList.replace('opacity-0', 'opacity-100');
      this.els!.page.classList.remove('translate-x-10');
    });
  }

  unmount() {
    this.virtualList?.unmount();
    this.els?.page.remove();
    this.els = null;
    this.loadMore = null;
  }

  loadJsonFile = (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const self = this;

      file
        .stream()
        .pipeThrough(getWorkerJsonParserTransformStream())
        .pipeThrough(
          validateJsonType({
            onValidFile: () => {
              this.mount(file);
              resolve();
            },
            onInvalidFile: reject,
          }),
        )
        .pipeTo(
          new WritableStream({
            write({ lines, stats: { processedBytes, chunkIndex } }) {
              return new Promise(loadNext => {
                self.virtualList!.appendLines(lines, loadNext, processedBytes);

                if (chunkIndex === 0) {
                  // display the tree after the first page of the virtual list is displayed
                  self.display();
                }

                if (processedBytes === file.size) {
                  // always read an additional chunk to make sure that
                  // unexpected end of file error is captured for small json
                  // files as it's sent in the second chunk
                  loadNext();
                }
              });
            },
          }),
        );
    });
  };
}
