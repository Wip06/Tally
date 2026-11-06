import { DEFAULT_TIMER_MINUTES, MAX_HISTORY_ENTRIES, STORAGE_KEY } from './constants';
import { teamPalette } from './themes';
import { isScoreMode } from './types';
import type { AppState, Counter, HistoryEntry, ScoreCounter, Team, TimerCounter } from './types';

// ---------- Persistance ----------

export const state: AppState = loadState();

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (isRecord(parsed) && Array.isArray(parsed.counters)) {
      return { counters: parsed.counters.filter(isRecord).map(normalizeCounter) };
    }
  } catch (e) {
    console.warn('Impossible de lire les données locales, réinitialisation.', e);
  }
  return { counters: [] };
}

export function saveState(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Impossible d'enregistrer les données locales.", e);
  }
}

// Les données viennent du localStorage, potentiellement écrites par une ancienne version :
// on complète les champs manquants pour que le reste du code puisse se fier aux types.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function positiveOrNull(value: unknown): number | null {
  return typeof value === 'number' && value > 0 ? value : null;
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeTeam(raw: unknown, index: number): Team {
  const t = isRecord(raw) ? raw : {};
  return {
    ...t,
    id: stringOr(t.id, uid('t')),
    name: stringOr(t.name, `Équipe ${index + 1}`),
    color: stringOr(t.color, paletteColor(index)),
    score: finiteOr(t.score, 0),
    points: finiteOr(t.points, 0),
    games: finiteOr(t.games, 0),
  };
}

function normalizeCounter(raw: Record<string, unknown>): Counter {
  const base = {
    ...raw,
    id: stringOr(raw.id, uid('c')),
    name: stringOr(raw.name, ''),
    mode: isScoreMode(raw.mode) ? raw.mode : 'tap',
    teams: Array.isArray(raw.teams) ? raw.teams.map(normalizeTeam) : [],
    history: Array.isArray(raw.history) ? (raw.history as HistoryEntry[]) : undefined,
    servingTeamId: typeof raw.servingTeamId === 'string' ? raw.servingTeamId : null,
    matchStartedAt: typeof raw.matchStartedAt === 'string' ? raw.matchStartedAt : null,
  };
  if (raw.type === 'timer') {
    return {
      ...base,
      type: 'timer',
      durationMinutes: positiveOrNull(raw.durationMinutes) ?? DEFAULT_TIMER_MINUTES,
    };
  }
  return { ...base, type: 'score', targetScore: positiveOrNull(raw.targetScore) };
}

export function uid(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

// ---------- Opérations sur les données ----------

export function getCounter(id: string | null): Counter | null {
  return state.counters.find(c => c.id === id) ?? null;
}

function newTeam(name: string, color: string): Team {
  return { id: uid('t'), name, color, score: 0, points: 0, games: 0 };
}

/** N-ième couleur d'équipe du thème courant (on reboucle après la 12e). */
function paletteColor(index: number): string {
  const palette = teamPalette();
  return palette[index % palette.length];
}

export function createCounter(name: string): ScoreCounter {
  const counter: ScoreCounter = {
    id: uid('c'),
    type: 'score',
    name: name.trim() || 'Compteur sans nom',
    mode: 'tap',
    targetScore: null,
    servingTeamId: null,
    teams: [newTeam('Nous', paletteColor(9)), newTeam('Eux', paletteColor(8))],
  };
  state.counters.push(counter);
  saveState();
  return counter;
}

export function createTimer(name: string, minutes: number): TimerCounter {
  const timer: TimerCounter = {
    id: uid('c'),
    type: 'timer',
    name: name.trim() || 'Minuteur',
    durationMinutes: minutes > 0 ? minutes : DEFAULT_TIMER_MINUTES,
    mode: 'tap',
    teams: [],
  };
  state.counters.push(timer);
  saveState();
  return timer;
}

/** Remplace tous les compteurs (restauration d'une sauvegarde). Renvoie le nombre de compteurs restaurés. */
export function replaceAllCounters(raw: readonly unknown[]): number {
  state.counters = raw.filter(isRecord).map(normalizeCounter);
  saveState();
  return state.counters.length;
}

export function deleteCounter(id: string): void {
  state.counters = state.counters.filter(c => c.id !== id);
  saveState();
}

export function addTeam(counter: Counter): void {
  const index = counter.teams.length;
  counter.teams.push(newTeam(`Équipe ${index + 1}`, paletteColor(index)));
  saveState();
}

export function removeTeam(counter: Counter, teamId: string): void {
  counter.teams = counter.teams.filter(t => t.id !== teamId);
  saveState();
}

/** Remet scores, jeux et points à zéro : une nouvelle partie commence (sans sauvegarder). */
export function resetScores(counter: Counter): void {
  for (const team of counter.teams) {
    team.score = 0;
    team.points = 0;
    team.games = 0;
  }
  counter.matchStartedAt = null;
}

/** À appeler à chaque changement de score : retient l'heure du premier point, puis sauvegarde. */
export function commitScoreChange(counter: Counter): void {
  if (!counter.matchStartedAt) counter.matchStartedAt = new Date().toISOString();
  saveState();
}

/** Ajoute la partie en cours à l'historique, s'il y a eu au moins un point (sans sauvegarder). */
export function logMatchToHistory(counter: Counter): void {
  if (!counter.teams.length) return;
  const maxScore = Math.max(...counter.teams.map(t => t.score));
  if (maxScore <= 0) return;
  const tennis = counter.mode === 'tennis';
  const entry: HistoryEntry = {
    date: new Date().toISOString(),
    startedAt: counter.matchStartedAt ?? undefined,
    mode: counter.mode,
    targetScore: counter.type === 'score' ? counter.targetScore : null,
    winners: counter.teams.filter(t => t.score === maxScore).map(t => ({ name: t.name, color: t.color })),
    scores: counter.teams.map(t => ({
      name: t.name,
      color: t.color,
      score: t.score,
      ...(tennis ? { games: t.games } : {}),
    })),
  };
  counter.history = [entry, ...(counter.history ?? [])].slice(0, MAX_HISTORY_ENTRIES);
}
