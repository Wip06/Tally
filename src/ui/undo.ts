import { UNDO_TIMEOUT_MS } from '../constants';
import { getCounter, saveState } from '../store';
import type { Counter, HistoryEntry, Team } from '../types';
import { byId } from './dom';

interface UndoSnapshot {
  counterId: string;
  teams: Team[];
  history: HistoryEntry[];
  matchStartedAt: string | null;
}

let snapshot: UndoSnapshot | null = null;
let toastTimer: number | undefined;

/** Mémorise l'état des équipes avant une action et affiche l'alerte « Annuler ». */
export function pushUndo(counter: Counter, message: string): void {
  snapshot = {
    counterId: counter.id,
    teams: structuredClone(counter.teams),
    history: structuredClone(counter.history ?? []),
    matchStartedAt: counter.matchStartedAt ?? null,
  };
  clearTimeout(toastTimer);
  byId('undo-toast-message').textContent = message;
  byId('undo-toast').hidden = false;
  toastTimer = window.setTimeout(dismissUndo, UNDO_TIMEOUT_MS);
}

export function dismissUndo(): void {
  clearTimeout(toastTimer);
  byId('undo-toast').hidden = true;
  snapshot = null;
}

/** Restaure le dernier instantané. Renvoie le compteur restauré (à re-rendre), s'il existe encore. */
export function undoLastAction(): Counter | null {
  if (!snapshot) return null;
  const counter = getCounter(snapshot.counterId);
  if (counter) {
    counter.teams = snapshot.teams;
    counter.history = snapshot.history;
    counter.matchStartedAt = snapshot.matchStartedAt;
    saveState();
  }
  dismissUndo();
  return counter;
}
