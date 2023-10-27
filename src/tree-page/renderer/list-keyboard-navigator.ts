export class ListKeyboardNavigator {
  private activeLine: HTMLElement | null = null;
  private lineSelector = '[role="treeitem"]';

  keyPressHandlers: {
    [key: string]: () => boolean;
  } = {
    ArrowDown: this.focusNextLine.bind(this),
    ArrowUp: this.focusPreviousLine.bind(this),
    ArrowLeft: this.focusParent.bind(this),
    ArrowRight: this.focusFirstChild.bind(this),
    Home: this.focusFirstLine.bind(this),
    End: this.focusLastLine.bind(this),
  };

  constructor(private root: HTMLElement) {}

  queryFocusedLine() {
    this.root.querySelector('[data-focused]');
  }

  public mount() {
    const firstLine = this.root.querySelector(this.lineSelector);

    if (firstLine) {
      this.setActive(firstLine as HTMLElement, false);
    }

    this.root.addEventListener('keydown', this.handleKeyPress);
    this.root.addEventListener('focusin', this.handleFocus);
  }

  public unmount() {
    this.root.removeEventListener('keydown', this.handleKeyPress);
    this.root.removeEventListener('focusin', this.handleFocus);
  }

  private isElementATreeItem(el: Element | undefined | null) {
    return el?.getAttribute('role') === 'treeitem';
  }

  private setActive(line: HTMLElement, focus = true) {
    if (this.activeLine) {
      this.activeLine.setAttribute('tabindex', '-1');
    }

    this.activeLine = line;
    this.activeLine.setAttribute('tabindex', '0');
    if (focus) {
      this.activeLine.focus();
    }
  }

  getNextLineElement() {
    if (this.activeLine != null) {
      if (this.isElementATreeItem(this.activeLine.nextElementSibling)) {
        return this.activeLine.nextElementSibling;
      } else {
        return this.activeLine.parentElement?.nextElementSibling?.querySelector(
          this.lineSelector,
        );
      }
    }
  }

  getPreviousLineElement(element?: Element) {
    element = element ?? this.activeLine ?? undefined;

    if (element != null) {
      if (this.isElementATreeItem(element.previousElementSibling)) {
        return element.previousElementSibling ?? undefined;
      } else {
        const prevPageLines =
          element.parentElement?.previousElementSibling?.querySelectorAll(
            this.lineSelector,
          );

        if (prevPageLines) {
          return [...prevPageLines].at(-1);
        }
      }
    }
  }

  private handleFocus = (ev: FocusEvent) => {
    if (this.isElementATreeItem(ev.target as HTMLElement)) {
      this.setActive(ev.target as HTMLElement, false);
    }
  };

  private handleKeyPress = (ev: KeyboardEvent) => {
    if (
      !this.isElementATreeItem(ev.target as HTMLElement) ||
      ev.altKey ||
      ev.ctrlKey ||
      ev.metaKey
    ) {
      return;
    }

    let handled = false;
    const handler = this.keyPressHandlers[ev.key];

    if (handler) {
      handled = handler();
    }

    if (handled) {
      ev.preventDefault();
    }
  };

  focusNextLine() {
    const nextLineElement = this.getNextLineElement();
    if (nextLineElement != null) {
      this.setActive(nextLineElement as HTMLElement);
      return true;
    }
    return false;
  }

  focusPreviousLine() {
    const previousLineElement = this.getPreviousLineElement();
    if (previousLineElement != null) {
      this.setActive(previousLineElement as HTMLElement);
      return true;
    }
    return false;
  }

  focusParent() {
    if (this.activeLine != null) {
      const parentLevel = (
        parseInt(this.activeLine.ariaLevel ?? '1') - 1
      ).toString();

      let currentLine: Element | undefined = this.activeLine;
      while (currentLine != null) {
        currentLine = this.getPreviousLineElement(currentLine);
        if (currentLine?.ariaLevel === parentLevel) {
          this.setActive(currentLine as HTMLElement);
          return true;
        }
      }
    }
    return false;
  }

  focusFirstChild() {
    if (this.activeLine != null) {
      const childrenLevel = (
        parseInt(this.activeLine.ariaLevel ?? '1') + 1
      ).toString();

      const nextLineElement = this.getNextLineElement();

      if (nextLineElement?.ariaLevel === childrenLevel) {
        this.setActive(nextLineElement as HTMLElement);
        return true;
      }
    }
    return false;
  }

  focusFirstLine() {
    const firstLineElement = this.root.querySelector(this.lineSelector);
    if (firstLineElement != null) {
      this.setActive(firstLineElement as HTMLElement);
      return true;
    }
    return false;
  }

  focusLastLine() {
    const allRenderedLines = this.root.querySelectorAll(this.lineSelector);
    const lastLineElement = [...allRenderedLines].at(-1);

    if (lastLineElement != null) {
      this.setActive(lastLineElement as HTMLElement);
      return true;
    }
    return false;
  }
}
