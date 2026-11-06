import { TENNIS_GAMES_PER_SET, TENNIS_POINTS_PER_GAME } from './constants';
import type { Counter, ScoreMode, Team } from './types';

// ---------- Objectif de score ----------

export function targetScoreOf(counter: Counter): number | null {
  return counter.type === 'score' ? counter.targetScore : null;
}

export function hasReachedTarget(counter: Counter, team: Team): boolean {
  const target = targetScoreOf(counter);
  return target !== null && team.score >= target;
}

// ---------- Mode libre : saisie avec calcul ----------

export type Operator = '+' | '-' | '*';

export function applyOp(a: number, op: Operator, b: number): number {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
  }
}

const EXPRESSION = /^(-?\d+)\s*([+\-*])\s*(-?\d+)$/;
const DELTA = /^([+\-*])\s*(-?\d+)$/;

/**
 * Interprète la saisie du mode libre :
 * - `12`     → 12
 * - `+5`     → score actuel + 5 (idem `-3`, `*2`)
 * - `10 * 3` → 30
 * - illisible → 0
 */
export function parseScoreInput(raw: string, current: number): number {
  const input = raw.trim();
  const expression = EXPRESSION.exec(input);
  if (expression) {
    return applyOp(parseInt(expression[1], 10), expression[2] as Operator, parseInt(expression[3], 10));
  }
  const delta = DELTA.exec(input);
  if (delta) {
    return applyOp(current, delta[1] as Operator, parseInt(delta[2], 10));
  }
  const value = parseInt(input, 10);
  return Number.isNaN(value) ? 0 : value;
}

// ---------- Tennis / Padel ----------

const TENNIS_LADDER = ['0', '15', '30', '40'] as const;

export function otherTeamsMax(teams: readonly Team[], team: Team, field: 'points' | 'games'): number {
  return teams
    .filter(t => t.id !== team.id)
    .reduce((max, t) => Math.max(max, t[field]), 0);
}

/** Libellé tennis d'un nombre de points : 0, 15, 30, 40, puis 40 / AD en cas d'égalité. */
export function pointLabel(points: number, otherPoints: number): string {
  if (points >= 3 && otherPoints >= 3) return points > otherPoints ? 'AD' : '40';
  return TENNIS_LADDER[Math.min(points, 3)];
}

/** Gagné si le seuil est atteint avec au moins 2 d'écart. */
export function isWon(value: number, otherValue: number, threshold: number): boolean {
  return value >= threshold && value - otherValue >= 2;
}

export type TennisOutcome = 'point' | 'game' | 'set';

/**
 * Donne un point à `team` et fait avancer jeux et sets.
 * À chaque jeu gagné, le service change de camp (à 2 équipes).
 */
export function scoreTennisPoint(counter: Counter, team: Team): TennisOutcome {
  team.points += 1;
  if (!isWon(team.points, otherTeamsMax(counter.teams, team, 'points'), TENNIS_POINTS_PER_GAME)) {
    return 'point';
  }

  team.games += 1;
  for (const t of counter.teams) t.points = 0;
  if (counter.teams.length === 2) {
    const nextServer = counter.teams.find(t => t.id !== counter.servingTeamId);
    if (nextServer) counter.servingTeamId = nextServer.id;
  }
  if (!isWon(team.games, otherTeamsMax(counter.teams, team, 'games'), TENNIS_GAMES_PER_SET)) {
    return 'game';
  }

  team.score += 1;
  for (const t of counter.teams) t.games = 0;
  return 'set';
}

// ---------- Classement : quelle équipe est en tête ----------

/** Clé de classement. En tennis : sets puis jeux (les points du jeu en cours sont trop volatils). */
function rankKey(team: Team, mode: ScoreMode): number[] {
  return mode === 'tennis' ? [team.score, team.games] : [team.score];
}

function compareKeys(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/**
 * Équipe à afficher en tête de liste.
 * - Aucune s'il y a moins de 2 équipes, ou si toutes sont à égalité et qu'aucune n'était déjà en tête.
 * - En cas d'égalité au sommet, l'équipe déjà en tête (`incumbentId`) garde sa place :
 *   on ne lui prend la première place qu'en la dépassant.
 */
export function findLeader(teams: readonly Team[], mode: ScoreMode, incumbentId: string | null): Team | null {
  if (teams.length < 2) return null;
  const keys = teams.map(t => rankKey(t, mode));
  const best = keys.reduce((max, key) => (compareKeys(key, max) > 0 ? key : max));
  const top = teams.filter((_, i) => compareKeys(keys[i], best) === 0);

  const incumbent = top.find(t => t.id === incumbentId);
  if (incumbent) return incumbent;
  if (top.length === teams.length) return null;
  return top[0];
}
