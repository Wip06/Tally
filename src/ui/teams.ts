import { prefersDarkText } from '../color';
import { TEAM_NAME_MAX_LENGTH } from '../constants';
import {
  findLeader,
  hasReachedTarget,
  otherTeamsMax,
  parseScoreInput,
  pointLabel,
  scoreTennisPoint,
  type Operator,
} from '../scoring';
import { commitScoreChange, removeTeam, saveState } from '../store';
import type { Counter, Team } from '../types';
import { checkWinCondition } from './celebration';
import { openColorPicker } from './color-picker';
import { button, byId, h, mutedText, prefersReducedMotion, pulse } from './dom';
import { confirmDialog } from './modals';
import { pushUndo } from './undo';

// ---------- Équipe en tête ----------

/**
 * Dernière équipe affichée en tête, par compteur. Sert à départager les égalités :
 * l'équipe en tête garde sa place tant qu'on ne la dépasse pas. Volontairement non sauvegardé.
 */
const leaders = new Map<string, string>();

/** À appeler quand les scores repartent de zéro. */
export function forgetLeader(counterId: string): void {
  leaders.delete(counterId);
}

function updateLeader(counter: Counter): Team | null {
  const leader = findLeader(counter.teams, counter.mode, leaders.get(counter.id) ?? null);
  if (leader) leaders.set(counter.id, leader.id);
  else leaders.delete(counter.id);
  return leader;
}

/** L'équipe en tête d'abord, puis les autres dans leur ordre de création. */
function displayOrder(counter: Counter, leader: Team | null): Team[] {
  return leader ? [leader, ...counter.teams.filter(t => t.id !== leader.id)] : [...counter.teams];
}

// ---------- Rendu de la liste ----------

function teamsListFor(counter: Counter): HTMLElement {
  return byId(counter.type === 'timer' ? 'timer-teams-list' : 'teams-list');
}

function cardsOf(list: HTMLElement): HTMLElement[] {
  return Array.from(list.querySelectorAll<HTMLElement>(':scope > .team-card'));
}

/** (Re)construit toutes les cartes d'équipe du compteur. */
export function renderTeams(counter: Counter): void {
  const list = teamsListFor(counter);
  animateMoves(list, () => {
    if (!counter.teams.length) {
      list.replaceChildren(mutedText('Aucune équipe. Ajoute-en une pour commencer !'));
      return;
    }
    const leader = updateLeader(counter);
    list.replaceChildren(...displayOrder(counter, leader).map(team => buildTeamCard(counter, team, team === leader)));
  });
}

/**
 * Remonte l'équipe en tête sans reconstruire les cartes : on déplace les nœuds existants,
 * ce qui préserve la saisie en cours, le focus et l'animation « pulse ».
 */
function refreshLeader(counter: Counter): void {
  const list = teamsListFor(counter);
  const cardsById = new Map(cardsOf(list).map(card => [card.dataset.teamId, card]));
  const leader = updateLeader(counter);
  const ordered = displayOrder(counter, leader)
    .map(team => cardsById.get(team.id))
    .filter((card): card is HTMLElement => card !== undefined);

  animateMoves(list, () => {
    for (const card of ordered) card.classList.toggle('team-card--leader', card.dataset.teamId === leader?.id);
    reorderChildren(list, ordered);
  });
}

function reorderChildren(list: HTMLElement, ordered: HTMLElement[]): void {
  // Déplacer un nœud lui fait perdre le focus : on le rend ensuite à l'élément qui l'avait.
  const active = document.activeElement;
  const focused = active instanceof HTMLElement && list.contains(active) ? active : null;
  const selection =
    focused instanceof HTMLInputElement ? { start: focused.selectionStart, end: focused.selectionEnd } : null;

  ordered.forEach((card, index) => {
    const current = list.children[index];
    if (current !== card) list.insertBefore(card, current ?? null);
  });

  if (focused && document.activeElement !== focused) {
    focused.focus({ preventScroll: true });
    if (focused instanceof HTMLInputElement && selection?.start != null && selection.end != null) {
      focused.setSelectionRange(selection.start, selection.end);
    }
  }
}

/** Anime le déplacement des cartes entre avant et après `mutate` (technique FLIP). */
function animateMoves(list: HTMLElement, mutate: () => void): void {
  const before = new Map<string, DOMRect>();
  for (const card of cardsOf(list)) {
    const rect = card.getBoundingClientRect();
    // Vue masquée : rien à animer.
    if (rect.width || rect.height) before.set(card.dataset.teamId ?? '', rect);
  }

  mutate();

  if (!before.size || prefersReducedMotion()) return;
  for (const card of cardsOf(list)) {
    const from = before.get(card.dataset.teamId ?? '');
    if (!from) continue;
    const to = card.getBoundingClientRect();
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
    card.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
      duration: 320,
      easing: 'cubic-bezier(.2, .8, .2, 1)',
    });
  }
}

// ---------- Carte d'équipe ----------

function buildTeamCard(counter: Counter, team: Team, isLeader: boolean): HTMLElement {
  const card = h('div', {
    className: 'team-card',
    style: { '--team-color': team.color },
    // Texte du score foncé ou clair selon la couleur de l'équipe, pour rester lisible.
    attrs: { 'data-team-id': team.id, 'data-ink': prefersDarkText(team.color) ? 'dark' : 'light' },
  });
  card.classList.toggle('team-card--leader', isLeader);
  card.classList.toggle('team-card--winner', hasReachedTarget(counter, team));
  card.append(buildCardHeader(counter, team), buildScoreZone(counter, team, card));
  return card;
}

function buildCardHeader(counter: Counter, team: Team): HTMLElement {
  const colorBtn = button(
    { className: 'team-color-dot', style: { background: team.color }, label: "Changer la couleur de l'équipe" },
    () =>
      openColorPicker(team.color, color => {
        team.color = color;
        saveState();
        renderTeams(counter);
      }),
  );

  const nameInput = h('input', {
    className: 'team-name-input',
    props: { type: 'text', value: team.name, maxLength: TEAM_NAME_MAX_LENGTH },
    attrs: { 'aria-label': "Nom de l'équipe" },
  });
  nameInput.addEventListener('input', () => {
    team.name = nameInput.value;
    saveState();
  });

  const removeBtn = button({ className: 'team-remove-btn', text: '✕', label: "Supprimer l'équipe" }, async () => {
    const ok = await confirmDialog(`Supprimer l'équipe "${team.name}" ?`, {
      title: "Supprimer l'équipe",
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    removeTeam(counter, team.id);
    renderTeams(counter);
  });

  return h('div', { className: 'team-card__header' }, colorBtn, nameInput, removeBtn);
}

function buildScoreZone(counter: Counter, team: Team, card: HTMLElement): HTMLElement {
  switch (counter.mode) {
    case 'tennis': return buildTennisZone(counter, team);
    case 'manual': return buildManualZone(counter, team, card);
    case 'tap': return buildTapZone(counter, team, card);
  }
}

function refreshWinner(counter: Counter, team: Team, card: HTMLElement): void {
  card.classList.toggle('team-card--winner', hasReachedTarget(counter, team));
}

/** Mode « Clic +1 » : on tape sur le score. */
function buildTapZone(counter: Counter, team: Team, card: HTMLElement): HTMLElement {
  const scoreBtn = button(
    { className: 'team-score-tap', text: team.score, label: `Ajouter un point à ${team.name}` },
    () => {
      pushUndo(counter, `+1 pour ${team.name}`);
      const previous = team.score;
      team.score += 1;
      commitScoreChange(counter);
      scoreBtn.textContent = String(team.score);
      pulse(scoreBtn);
      refreshWinner(counter, team, card);
      checkWinCondition(counter, team, previous);
      refreshLeader(counter);
    },
  );

  const minusBtn = button(
    { className: 'team-minus-btn', text: '-1', label: `Retirer un point à ${team.name}` },
    () => {
      pushUndo(counter, `-1 pour ${team.name}`);
      team.score -= 1;
      commitScoreChange(counter);
      scoreBtn.textContent = String(team.score);
      refreshWinner(counter, team, card);
      refreshLeader(counter);
    },
  );

  return h('div', { className: 'team-score-zone' }, scoreBtn, minusBtn);
}

const OPERATOR_BUTTONS: readonly [Operator, string][] = [['+', '+'], ['-', '-'], ['*', 'x']];

/** Mode « Libre » : saisie directe, avec calcul rapide (+5, -3, *2, 10*3…). */
function buildManualZone(counter: Counter, team: Team, card: HTMLElement): HTMLElement {
  const input = h('input', {
    className: 'team-score-input',
    props: {
      type: 'text',
      inputMode: 'numeric',
      value: String(team.score),
      title: 'Tape un nombre pour fixer le score, ou utilise +/-/x pour calculer',
    },
    attrs: { 'aria-label': `Score de ${team.name}` },
  });

  input.addEventListener('change', () => {
    const next = parseScoreInput(input.value, team.score);
    const previous = team.score;
    input.value = String(next);
    if (next === previous) return;
    pushUndo(counter, `Score de ${team.name} modifié`);
    team.score = next;
    commitScoreChange(counter);
    refreshWinner(counter, team, card);
    checkWinCondition(counter, team, previous);
    refreshLeader(counter);
  });

  const ops = h(
    'div',
    { className: 'team-score-ops' },
    ...OPERATOR_BUTTONS.map(([op, label]) =>
      button({ className: 'team-score-op-btn', text: label, label: `Insérer l'opérateur ${label}` }, () => {
        input.value = input.value.trim().replace(/[+\-*]\s*$/, '') + op;
        input.focus();
      }),
    ),
  );

  return h('div', { className: 'team-score-zone team-score-zone--manual' }, input, ops);
}

/** Mode « Tennis-Padel » : points 0/15/30/40/AD, jeux, sets et service. */
function buildTennisZone(counter: Counter, team: Team): HTMLElement {
  const { score: sets, games } = team;
  const gamesBadge = h('div', {
    className: 'team-games-badge',
    text: `${sets} set${sets > 1 ? 's' : ''} · ${games} jeu${games > 1 ? 'x' : ''}`,
  });

  const serving = counter.servingTeamId === team.id;
  const serveBtn = button(
    {
      className: serving ? 'team-serve-toggle active' : 'team-serve-toggle',
      text: serving ? 'Service' : 'Marquer au service',
      label: `${team.name} Service`,
    },
    () => {
      counter.servingTeamId = counter.servingTeamId === team.id ? null : team.id;
      saveState();
      renderTeams(counter);
    },
  );

  const pointBtn = button(
    {
      className: 'team-score-tap',
      text: pointLabel(team.points, otherTeamsMax(counter.teams, team, 'points')),
      label: `Point pour ${team.name}`,
    },
    () => {
      pushUndo(counter, `Point pour ${team.name}`);
      const previousSets = team.score;
      const outcome = scoreTennisPoint(counter, team);
      commitScoreChange(counter);
      renderTeams(counter);
      if (outcome === 'set') checkWinCondition(counter, team, previousSets);
    },
  );

  const minusBtn = button(
    { className: 'team-minus-btn', text: '-1', label: `Retirer un point à ${team.name}` },
    () => {
      pushUndo(counter, `-1 point pour ${team.name}`);
      team.points = Math.max(0, team.points - 1);
      commitScoreChange(counter);
      renderTeams(counter);
    },
  );

  return h(
    'div',
    { className: 'team-score-zone team-score-zone--tennis' },
    gamesBadge,
    serveBtn,
    h('div', { className: 'team-score-zone' }, pointBtn, minusBtn),
  );
}
