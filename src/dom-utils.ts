type Child = HTMLElement | string;

// poor man's JSX for DOM creation
// usage: tree('div', { class: 'foo' }, [tag('span', {}, 'text')])
function tree(
  name: string,
  attrs: Record<string, string> = {},
  children: Child | Child[] = [],
): HTMLElement {
  const el = document.createElement(name);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  children = Array.isArray(children) ? children : [children];
  children.forEach(child =>
    el.appendChild(
      typeof child === 'string' ? document.createTextNode(child) : child,
    ),
  );
  return el;
}

// create a tree of DOM elements and extract references to named elements
// usage: const { title } = namedTree(t => t('div', {}, [t('span!title')]))
export function namedTree<R extends {}>(
  buildFn: (tagFn: typeof tree) => HTMLElement,
): R {
  const refs: Record<string, HTMLElement> = {};

  const named = (...[s, ...args]: Parameters<typeof tree>) => {
    if (!s.includes('!')) {
      return tree(s, ...args);
    }

    const [tag, name] = s.split('!');
    refs[name] = tree(tag, ...args);
    return refs[name];
  };

  buildFn(named);
  return refs as any;
}
