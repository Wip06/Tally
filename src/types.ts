export type ScoreMode = 'tap' | 'manual' | 'tennis';
export type CounterType = 'score' | 'timer';

export const SCORE_MODES: readonly ScoreMode[] = ['tap', 'manual', 'tennis'];

export function isScoreMode(value: unknown): value is ScoreMode {
  return SCORE_MODES.includes(value as ScoreMode);
}

export interface Team {
  id: string;
  name: string;
  color: string;
  /** Score principal. En mode tennis : nombre de sets gagnés. */
  score: number;
  /** Tennis : points du jeu en cours (0, 1, 2, 3… affichés 0 / 15 / 30 / 40 / AD). */
  points: number;
  /** Tennis : jeux gagnés dans le set en cours. */
  games: number;
}

export interface TeamSnapshot {
  name: string;
  color: string;
}

export interface HistoryScore extends TeamSnapshot {
  score: number;
  /** Tennis : jeux du set en cours au moment de la fin. */
  games?: number;
}

/**
 * Partie terminée. Les champs optionnels n'existent que pour les parties
 * enregistrées depuis la v4 : l'affichage doit s'en passer.
 */
export interface HistoryEntry {
  /** Date ISO de fin de partie. */
  date: string;
  /** Date ISO du premier point marqué. */
  startedAt?: string;
  mode?: ScoreMode;
  targetScore?: number | null;
  winners: TeamSnapshot[];
  scores: HistoryScore[];
}

interface CounterBase {
  id: string;
  name: string;
  mode: ScoreMode;
  teams: Team[];
  /** Tennis : équipe au service. */
  servingTeamId?: string | null;
  /** Parties terminées, la plus récente en premier. */
  history?: HistoryEntry[];
  /** Date ISO du premier point de la partie en cours (pour la durée dans l'historique). */
  matchStartedAt?: string | null;
}

export interface ScoreCounter extends CounterBase {
  type: 'score';
  targetScore: number | null;
  servingTeamId: string | null;
}

export interface TimerCounter extends CounterBase {
  type: 'timer';
  durationMinutes: number;
}

export type Counter = ScoreCounter | TimerCounter;

export interface AppState {
  counters: Counter[];
}
