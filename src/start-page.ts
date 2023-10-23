export class StartPage {
  prefix = 'start-page__';

  page = this.getById<HTMLDivElement>('page');
  button = this.getById<HTMLButtonElement>('json-input-button');
  jsonInput = this.getById('json-input');
  errorPlaceholder = this.getById<HTMLDivElement>('error-placeholder');

  constructor() {
    this.#enableButtonBindings();
  }

  getById<E extends HTMLElement>(id: string): E {
    const completeId = `${this.prefix}${id}`;
    const el = document.getElementById(completeId) as E;
    if (!el) {
      throw new Error(`Element with id '${completeId}' not found`);
    }
    return el;
  }

  #enableButtonBindings() {
    this.button.addEventListener('click', () => {
      this.jsonInput.click();
    });
  }

  onSelectFile(callback: (file: File | undefined) => unknown) {
    this.jsonInput.addEventListener('change', event => {
      // clear error msg
      this.setError('');

      const jsonFile = (event.currentTarget! as HTMLInputElement).files![0];
      callback(jsonFile);
    });
  }

  setError = (message: string) => {
    this.errorPlaceholder.textContent = message ?? '';
    const parent = this.errorPlaceholder.parentElement!;
    const classes = { show: 'grid-rows-[1fr]', hide: 'grid-rows-[0fr]' };

    if (!message) {
      parent.classList.remove(classes.show);
      parent.classList.add(classes.hide);
    } else {
      parent.classList.remove(classes.hide);
      parent.classList.add(classes.show);
    }
  };

  hidePage = () => {
    this.page.classList.add('hidden');
  };
}

// export function enableStartPage() {
//   console.log('start-page.ts');
//
//   const jsonInput = document.getElementById('start-page__json-input');
//   jsonInput.addEventListener('change', (event) => {
//     const jsonFile = event.currentTarget.files[0];
//
//
//
//   });
// }
