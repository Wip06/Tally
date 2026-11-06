/** `document.getElementById` qui échoue bruyamment si l'élément manque dans index.html. */
export function byId<T extends Element = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Élément #${id} introuvable dans le DOM.`);
  return el as unknown as T;
}

export interface ElementOptions<E extends HTMLElement = HTMLElement> {
  className?: string;
  text?: string | number;
  /** Attributs HTML (aria-*, data-*…). */
  attrs?: Record<string, string>;
  /** Propriétés CSS, variables comprises (`--team-color`…). */
  style?: Record<string, string>;
  /** Propriétés DOM (`value`, `type`, `maxLength`…). */
  props?: Partial<E>;
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions<HTMLElementTagNameMap[K]> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (options.props) Object.assign(el, options.props);
  if (options.className) el.className = options.className;
  if (options.text !== undefined) el.textContent = String(options.text);
  for (const [name, value] of Object.entries(options.attrs ?? {})) el.setAttribute(name, value);
  for (const [prop, value] of Object.entries(options.style ?? {})) el.style.setProperty(prop, value);
  el.append(...children);
  return el;
}

/** `<button type="button">` avec libellé accessible et gestionnaire de clic. */
export function button(
  options: ElementOptions<HTMLButtonElement> & { label?: string },
  onClick: (event: MouseEvent) => void,
): HTMLButtonElement {
  const btn = h('button', options);
  btn.type = 'button';
  if (options.label) btn.setAttribute('aria-label', options.label);
  btn.addEventListener('click', onClick);
  return btn;
}

/** Rend un élément non-bouton activable au clic et au clavier (Entrée / Espace). */
export function makeActivatable(el: HTMLElement, label: string, onActivate: () => void): void {
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', label);
  el.addEventListener('click', onActivate);
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate();
    }
  });
}

export function mutedText(text: string): HTMLParagraphElement {
  return h('p', { className: 'muted-text', text });
}

/** Relance l'animation « pulse » d'un élément. */
export function pulse(el: HTMLElement): void {
  el.classList.remove('pulse');
  void el.offsetWidth; // force un reflow pour que l'animation reparte de zéro
  el.classList.add('pulse');
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}
