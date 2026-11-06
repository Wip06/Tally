export type Route = { view: 'home' } | { view: 'counter'; id: string };

export const HOME_HASH = '#/';

export function counterHash(id: string): string {
  return `#/counter/${id}`;
}

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '');
  if (path.startsWith('counter/')) return { view: 'counter', id: path.slice('counter/'.length) };
  return { view: 'home' };
}

export function navigate(hash: string): void {
  location.hash = hash;
}
