import { prefersDarkText } from '../color';
import type { Counter, HistoryEntry, HistoryScore, ScoreMode } from '../types';
import { button, byId, h, mutedText } from './dom';
import { openModal } from './modals';

const MODE_LABELS: Record<ScoreMode, string> = {
  tap: 'Clic +1',
  manual: 'Libre',
  tennis: 'Tennis-Padel',
};

const CHEVRON_SVG =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m9 18 6-6-6-6"/></svg>';

// ---------- Mise en forme ----------

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

function formatLongDate(iso: string): string {
  const text = new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** Durée lisible : « moins d'une minute », « 38 min », « 1 h 05 ». */
function formatDuration(startIso: string, endIso: string): string | null {
  const minutes = Math.round((Date.parse(endIso) - Date.parse(startIso)) / 60000);
  if (!Number.isFinite(minutes) || minutes < 0) return null;
  if (minutes < 1) return "moins d'une minute";
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}

function rankLabel(rank: number): string {
  return rank === 1 ? '1er' : `${rank}e`;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${Math.abs(count) > 1 ? 's' : ''}`;
}

// ---------- Classement d'une partie terminée ----------

interface RankedScore extends HistoryScore {
  rank: number;
}

/** Trie par score (puis jeux en tennis) ; les ex æquo partagent le même rang (1, 1, 3…). */
function rankScores(entry: HistoryEntry): RankedScore[] {
  const sorted = [...entry.scores].sort((a, b) => b.score - a.score || (b.games ?? 0) - (a.games ?? 0));
  return sorted.map((s, i) => {
    const first = sorted.findIndex(o => o.score === s.score && (o.games ?? 0) === (s.games ?? 0));
    return { ...s, rank: (first === -1 ? i : first) + 1 };
  });
}

/** « de Nous », mais « d'Eux », « d'Équipe 3 ». */
function ofName(name: string): string {
  return /^[aeiouyàâäéèêëîïôöùûüœ]/i.test(name.trim()) ? `d'${name}` : `de ${name}`;
}

/** « Victoire de Nous avec 3 points d'avance », ou « Égalité entre A et B ». */
function verdict(entry: HistoryEntry, ranked: RankedScore[]): string {
  const winners = ranked.filter(s => s.rank === 1);
  if (winners.length > 1) return `Égalité entre ${winners.map(w => w.name).join(' et ')}`;
  const [winner, runnerUp] = ranked;
  if (!runnerUp) return `Victoire ${ofName(winner.name)}`;
  const unit = entry.mode === 'tennis' ? 'set' : 'point';
  const lead = winner.score - runnerUp.score;
  return lead > 0
    ? `Victoire ${ofName(winner.name)} avec ${plural(lead, unit)} d'avance`
    : `Victoire ${ofName(winner.name)} aux jeux`;
}

// ---------- Vues ----------

/** Ouvre l'historique d'un compteur sur la liste des parties. */
export function openHistory(counter: Counter): void {
  showList(counter);
  openModal('modal-history');
}

function showList(counter: Counter, focusIndex?: number): void {
  byId('history-title').textContent = 'Historique des parties';
  const body = byId('history-body');
  const history = counter.history ?? [];

  if (!history.length) {
    body.replaceChildren(
      mutedText(
        "Aucune partie terminée pour l'instant. Termine une partie et réinitialise les scores pour l'enregistrer ici.",
      ),
    );
    return;
  }

  const rows = history.map((entry, index) => {
    const winners = entry.winners.map(w => w.name).join(' & ');
    const scores = rankScores(entry).map(s => s.score).join(' - ');
    const row = button(
      { className: 'history-row', label: `Voir le détail de la partie du ${formatShortDate(entry.date)}` },
      () => showEntry(counter, index),
    );
    row.append(
      h('span', { className: 'history-date', text: formatShortDate(entry.date) }),
      h(
        'span',
        { className: 'history-result' },
        h('span', { className: 'team-dot', style: { background: entry.winners[0]?.color ?? 'transparent' } }),
        `${winners} (${scores})`,
      ),
    );
    row.insertAdjacentHTML('beforeend', CHEVRON_SVG);
    return row;
  });
  body.replaceChildren(h('div', { className: 'history-list' }, ...rows));
  if (focusIndex !== undefined) rows[focusIndex]?.focus();
}

/** Détail d'une partie : une carte par équipe, comme pendant la partie. */
function showEntry(counter: Counter, index: number): void {
  const entry = counter.history?.[index];
  if (!entry) return;
  const ranked = rankScores(entry);

  byId('history-title').textContent = formatLongDate(entry.date);

  const meta = [
    formatTime(entry.date),
    entry.startedAt ? formatDuration(entry.startedAt, entry.date) : null,
    entry.mode ? MODE_LABELS[entry.mode] : null,
    entry.targetScore ? `Objectif ${entry.targetScore}` : null,
  ].filter((part): part is string => Boolean(part));

  const back = button({ className: 'btn btn-ghost history-back', text: '← Toutes les parties' }, () =>
    showList(counter, index),
  );

  const cards = ranked.map(s => {
    const isWinner = s.rank === 1;
    const detail =
      entry.mode === 'tennis'
        ? `${plural(s.score, 'set')}${s.games ? ` · ${s.games} jeu${s.games > 1 ? 'x' : ''}` : ''}`
        : null;
    return h(
      'div',
      {
        className: isWinner ? 'history-team history-team--winner' : 'history-team',
        style: { '--team-color': s.color },
        attrs: { 'data-ink': prefersDarkText(s.color) ? 'dark' : 'light' },
      },
      h(
        'div',
        { className: 'history-team__head' },
        h('span', { className: 'history-team__rank', text: rankLabel(s.rank) }),
        h('span', { className: 'history-team__name', text: s.name }),
      ),
      h('div', { className: 'history-team__score', text: s.score }),
      ...(detail ? [h('div', { className: 'history-team__detail', text: detail })] : []),
    );
  });

  byId('history-body').replaceChildren(
    h(
      'div',
      { className: 'history-detail' },
      back,
      h('p', { className: 'history-detail__meta', text: meta.join(' · ') }),
      h('p', { className: 'history-detail__verdict', text: verdict(entry, ranked) }),
      h('div', { className: 'history-teams' }, ...cards),
    ),
  );
  back.focus();
}
