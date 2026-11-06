import { DEFAULT_TIMER_MINUTES } from '../constants';
import { counterHash, navigate } from '../routes';
import type { Counter, ScoreCounter, ScoreMode, TimerCounter } from '../types';
import { byId, h, makeActivatable, mutedText, pad2 } from './dom';

const MODE_BADGES: Record<ScoreMode, string> = {
  tap: 'Clic',
  manual: 'Libre',
  tennis: 'Raquette',
};

export function renderHome(counters: readonly Counter[]): void {
  const hasCounters = counters.length > 0;
  byId('empty-state').hidden = hasCounters;
  byId('home-toolbar').hidden = !hasCounters;
  if (hasCounters) {
    byId('counters-count').textContent = `${counters.length} compteur${counters.length > 1 ? 's' : ''}`;
  }
  byId('counters-grid').replaceChildren(
    ...counters.map(counter => (counter.type === 'timer' ? buildTimerCard(counter) : buildScoreCard(counter))),
  );
}

function cardShell(counter: Counter, badge: string, label: string, extraClass = ''): HTMLElement {
  const card = h(
    'div',
    { className: `counter-card ${extraClass}`.trim() },
    h(
      'div',
      { className: 'counter-card__header' },
      h('h3', { className: 'counter-card__title', text: counter.name }),
      h('span', { className: 'mode-badge', text: badge }),
    ),
  );
  makeActivatable(card, label, () => navigate(counterHash(counter.id)));
  return card;
}

function buildScoreCard(counter: ScoreCounter): HTMLElement {
  const card = cardShell(counter, MODE_BADGES[counter.mode], `Ouvrir le compteur ${counter.name}`);
  const preview = h('div', { className: 'counter-card__teams' });

  const sorted = [...counter.teams].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  if (!top) {
    preview.append(mutedText('Aucune équipe'));
  } else {
    card.style.setProperty('--accent', top.color);
    for (const team of sorted) {
      const name = h('span', { className: 'team-mini-name', text: team.name });
      if (sorted.length > 1 && team.score === top.score && top.score > 0) name.classList.add('is-leading');
      preview.append(
        h(
          'div',
          { className: 'team-mini-row' },
          h('span', { className: 'team-dot', style: { background: team.color } }),
          name,
          h('span', { className: 'team-mini-score', text: team.score }),
        ),
      );
    }
  }

  card.append(preview);
  return card;
}

function buildTimerCard(counter: TimerCounter): HTMLElement {
  const card = cardShell(counter, 'Minuteur', `Ouvrir le minuteur ${counter.name}`, 'counter-card--timer');
  const minutes = counter.durationMinutes || DEFAULT_TIMER_MINUTES;
  card.append(h('p', { className: 'timer-card-duration', text: `${pad2(minutes)}:00` }));
  return card;
}
