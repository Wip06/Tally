import { getCounter } from './store';
import type { Counter } from './types';

/** État d'interface éphémère (non sauvegardé). */
export const session = {
  /** Compteur ou minuteur actuellement ouvert ; `null` sur l'accueil. */
  currentCounterId: null as string | null,
};

export function currentCounter(): Counter | null {
  return getCounter(session.currentCounterId);
}

export function isCurrent(counter: Counter): boolean {
  return session.currentCounterId === counter.id;
}
