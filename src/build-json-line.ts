import { JSONLine, JSONLineType, JSONPrimitive } from './types';

export function buildLine(line: JSONLine): HTMLElement {
  switch (line.type) {
    case JSONLineType.OpenArray:
    case JSONLineType.OpenObject: {
      return buildOpenLine(line);
    }

    case JSONLineType.CloseArray:
    case JSONLineType.CloseObject: {
      return buildCloseLine(line);
    }

    case JSONLineType.Property: {
      return buildPropertyLine(line);
    }
    case JSONLineType.Error: {
      return buildErrorLine(line);
    }
    default: {
      throw Error(`Unknown line type: ${line}`);
    }
  }

  function buildOpenLine(
    line: JSONLine & { type: JSONLineType.OpenArray | JSONLineType.OpenObject },
  ) {
    return renderLineContainerTag(line, el => {
      if (line.key != null && line.key !== '') {
        el.appendChild(getKeyTag(line.key));
      }
      if (line.type === JSONLineType.OpenArray) {
        el.appendChild(getDelimiterTagForType(line.type));
      }
    });
  }

  function buildCloseLine(
    line: JSONLine & {
      type: JSONLineType.CloseArray | JSONLineType.CloseObject;
    },
  ) {
    return renderLineContainerTag(line, el => {
      el.appendChild(getDelimiterTagForType(line.type));
    });
  }

  function buildPropertyLine(line: JSONLine & { type: JSONLineType.Property }) {
    return renderLineContainerTag(line, el => {
      el.appendChild(getKeyTag(line.key));
      el.appendChild(getValueTag(line.value));
    });
  }

  function buildErrorLine(line: JSONLine & { type: JSONLineType.Error }) {
    return renderLineContainerTag(line, el => {
      const msg = document.createElement('span');
      msg.classList.add('text-red-800');
      msg.innerText = line.message;
      el.appendChild(msg);
    });
  }

  function getKeyTag(key: string | number | undefined | null) {
    const el = document.createElement('span');
    el.classList.add(
      typeof key === 'string' ? 'text-key' : 'text-indenting',
      'font-normal',
    );
    el.innerText = key + ': ';
    return el;
  }

  function getValueTag(value: JSONPrimitive) {
    const el = document.createElement('span');
    el.classList.add('font-normal', 'break-words');
    el.innerText = value?.toString() ?? 'null';
    return el;
  }

  function getDelimiterTagForType(
    type:
      | JSONLineType.OpenArray
      | JSONLineType.OpenObject
      | JSONLineType.CloseArray
      | JSONLineType.CloseObject,
  ) {
    const el = document.createElement('span');
    el.classList.add('font-bold', 'text-symbol');

    el.innerText = {
      [JSONLineType.OpenArray]: '[',
      [JSONLineType.OpenObject]: '{',
      [JSONLineType.CloseArray]: ']',
      [JSONLineType.CloseObject]: '}',
    }[type];

    return el;
  }

  function renderLineContainerTag(
    line: JSONLine,
    callback: (el: HTMLDivElement) => unknown,
  ) {
    const el = document.createElement('li');
    el.classList.add(
      'absolute',
      'rounded',
      'hover:bg-sky-50',
      'w-full',
      'focus:outline-none',
      'focus:ring-offset-2',
      'focus:ring',
      'focus:ring-sky-400',
    );
    el.setAttribute('aria-level', (line.level + 1).toString());
    el.setAttribute('role', 'treeitem');
    el.setAttribute('tabindex', '0');

    for (let i = 0; i < line.level; i++) {
      const verticalLineEl = document.createElement('div');
      verticalLineEl.classList.add(
        'absolute',
        'border-l',
        'border-indenting',
        'h-full',
      );
      verticalLineEl.style.left = `${i * 20 + 1.5}px`;
      el.appendChild(verticalLineEl);
    }

    if (line.level) {
      el.style.paddingLeft = `${line.level * 20}px`;
    }

    const innerEl = document.createElement('div');
    innerEl.classList.add('flex', 'gap-1');
    el.appendChild(innerEl);

    callback(innerEl);

    return el;
  }
}
