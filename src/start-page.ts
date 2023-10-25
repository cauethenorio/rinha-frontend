export class StartPage {
  prefix = 'start-page__';

  els = {
    page: this.getById('page'),
    button: this.getById('json-input-button'),
    fileInput: this.getById('json-input'),
    errorPlaceholder: this.getById('error-placeholder'),
  };

  constructor() {
    this.enableButtonBindings();
  }

  getById<E extends HTMLElement>(id: string): E {
    const completeId = `${this.prefix}${id}`;
    const el = document.getElementById(completeId) as E;
    if (!el) {
      throw new Error(`Element with id '${completeId}' not found`);
    }
    return el;
  }

  private enableButtonBindings() {
    this.els.button.addEventListener('click', () => {
      this.els.fileInput.click();
    });
  }

  onSelectFile(loadFile: (file: File | undefined) => Promise<unknown>) {
    this.els.fileInput.addEventListener('change', event => {
      // clear error msg
      this.setError('');

      const jsonFile = (event.currentTarget! as HTMLInputElement).files![0];

      loadFile(jsonFile).then(this.hide, error => {
        if ('type' in error && error.type === 'invalid-file') {
          return this.setError(error.message);
        }
        // a bug
        throw error;
      });
    });
  }

  setError = (message: string) => {
    this.els.errorPlaceholder.textContent = message ?? '';
    const parent = this.els.errorPlaceholder.parentElement!;
    const classes = { show: 'grid-rows-[1fr]', hide: 'grid-rows-[0fr]' };

    if (!message) {
      parent.classList.remove(classes.show);
      parent.classList.add(classes.hide);
    } else {
      parent.classList.remove(classes.hide);
      parent.classList.add(classes.show);
    }
  };

  hide = () => {
    requestAnimationFrame(() => {
      this.els.page.classList.add('-translate-x-10');
      this.els.page.classList.replace('opacity-100', 'opacity-0');
    });
  };
}
