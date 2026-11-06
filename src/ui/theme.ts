import { saveState, state } from '../store';
import { THEMES, currentTheme, getTheme, setCurrentTheme, themeIconSvg, type Theme, type ThemeId } from '../themes';
import { button, byId, h } from './dom';
import { closeModal, openModal, type ModalId } from './modals';

/** Applique le thème courant à la page : variables CSS, couleur de la barre d'état, icône de l'onglet. */
function paintTheme(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = theme.id;

  const barColor = getComputedStyle(root).getPropertyValue('--bg-1').trim();
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', barColor);

  const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (favicon) favicon.href = `data:image/svg+xml,${encodeURIComponent(themeIconSvg(theme))}`;
}

/**
 * Les équipes qui portent une couleur du thème précédent prennent la couleur
 * à la même place dans le nouveau thème. Les couleurs personnalisées ne bougent pas.
 */
function remapTeamColors(from: Theme, to: Theme): void {
  let changed = false;
  const remap = (item: { color: string }) => {
    const index = from.teamColors.findIndex(c => c.toLowerCase() === item.color.toLowerCase());
    if (index >= 0 && to.teamColors[index]) {
      item.color = to.teamColors[index];
      changed = true;
    }
  };
  for (const counter of state.counters) {
    counter.teams.forEach(remap);
    for (const entry of counter.history ?? []) {
      entry.scores.forEach(remap);
      entry.winners.forEach(remap);
    }
  }
  if (changed) saveState();
}

/** Change de thème tout de suite et l'enregistre sur l'appareil. */
function switchTheme(id: ThemeId, onChange: () => void): void {
  const previous = currentTheme();
  if (previous.id === id) return;
  const next = getTheme(id);
  setCurrentTheme(id);
  remapTeamColors(previous, next);
  paintTheme(next);
  renderThemeOptions(onChange);
  onChange();
}

function renderThemeOptions(onChange: () => void): void {
  const activeId = currentTheme().id;
  byId('theme-options').replaceChildren(
    ...THEMES.map(theme => {
      // L'aperçu porte son propre data-theme : il prend les couleurs du thème qu'il représente.
      const preview = h(
        'span',
        { className: 'theme-preview', attrs: { 'data-theme': theme.id, 'aria-hidden': 'true' } },
        h(
          'span',
          { className: 'theme-preview__card' },
          h(
            'span',
            { className: 'theme-preview__dots' },
            ...theme.teamColors.slice(0, 4).map(color => h('span', { style: { background: color } })),
          ),
          h('span', { className: 'theme-preview__goal' }),
        ),
      );
      const option = button(
        { className: 'theme-option', attrs: { 'aria-pressed': String(theme.id === activeId) } },
        () => switchTheme(theme.id, onChange),
      );
      option.append(
        preview,
        h('span', { className: 'theme-option__name', text: theme.name }),
        h('span', { className: 'theme-option__mood', text: theme.mood }),
      );
      return option;
    }),
  );
}

/**
 * Prépare le thème au démarrage et le sélecteur « Thème ».
 * `onChange` re-rend la vue affichée (les couleurs d'équipe ont pu changer).
 */
export function initTheme(onChange: () => void): void {
  paintTheme(currentTheme());

  const open = (from?: ModalId) => {
    if (from) closeModal(from);
    renderThemeOptions(onChange);
    openModal('modal-theme');
  };

  byId('btn-open-theme').addEventListener('click', () => open());
  // Raccourcis depuis les réglages d'un compteur ou d'un minuteur.
  document.querySelectorAll<HTMLButtonElement>('[data-open-theme]').forEach(btn => {
    btn.addEventListener('click', () => open(btn.closest<HTMLElement>('.modal-overlay')?.id as ModalId | undefined));
  });
  byId('btn-close-theme').addEventListener('click', () => closeModal('modal-theme'));
}
