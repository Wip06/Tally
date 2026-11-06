import { parseHash } from '../routes';
import { currentCounter, session } from '../session';
import { getCounter, saveState, state } from '../store';
import { isScoreMode, type Counter } from '../types';
import { renderDetail } from './detail';
import { byId } from './dom';
import { renderHome } from './home';
import { renderTimerView } from './timer';
import { dismissUndo } from './undo';

const VIEWS = ['view-home', 'view-detail', 'view-timer'] as const;
type ViewId = (typeof VIEWS)[number];

function showView(id: ViewId): void {
  for (const view of VIEWS) byId(view).hidden = view !== id;
}

function showHome(): void {
  dismissUndo();
  session.currentCounterId = null;
  showView('view-home');
  renderHome(state.counters);
}

function showCounter(counter: Counter): void {
  dismissUndo();
  session.currentCounterId = counter.id;
  renderCounter(counter);
}

/** Affiche la vue adaptée au type de compteur. */
function renderCounter(counter: Counter): void {
  if (counter.type === 'timer') {
    showView('view-timer');
    renderTimerView(counter);
  } else {
    showView('view-detail');
    renderDetail(counter);
  }
}

/** Affiche (ou ré-affiche) la vue correspondant à l'URL. */
export function refreshView(): void {
  const r = parseHash(location.hash);
  const counter = r.view === 'counter' ? getCounter(r.id) : null;
  if (counter) showCounter(counter);
  else showHome();
}

export function initRouter(): void {
  window.addEventListener('hashchange', refreshView);
  refreshView();
}

/** Sélecteurs de mode de score, présents dans les réglages du compteur et du minuteur. */
export function initModeSwitch(): void {
  document.querySelectorAll<HTMLButtonElement>('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const counter = currentCounter();
      const mode = btn.dataset.mode;
      if (!counter || !isScoreMode(mode)) return;
      counter.mode = mode;
      saveState();
      renderCounter(counter);
    });
  });
}
