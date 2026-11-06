import { HOME_HASH, navigate } from '../routes';
import { currentCounter } from '../session';
import { addTeam, deleteCounter, logMatchToHistory, resetScores, saveState } from '../store';
import type { ScoreCounter } from '../types';
import { byId } from './dom';
import { openHistory } from './history';
import { bindModalButton, confirmDialog } from './modals';
import { syncModeButtons } from './mode-switch';
import { forgetLeader, renderTeams } from './teams';
import { pushUndo } from './undo';

/** Vue d'un compteur de score. */
export function renderDetail(counter: ScoreCounter): void {
  byId<HTMLInputElement>('counter-name-input').value = counter.name;
  byId<HTMLInputElement>('target-score-input').value = counter.targetScore ? String(counter.targetScore) : '';
  syncModeButtons(counter.mode);
  renderTeams(counter);
}

function currentScoreCounter(): ScoreCounter | null {
  const counter = currentCounter();
  return counter?.type === 'score' ? counter : null;
}

export function initDetailView(): void {
  byId('btn-back').addEventListener('click', () => navigate(HOME_HASH));

  byId('btn-delete-counter').addEventListener('click', async () => {
    const counter = currentScoreCounter();
    if (!counter) return;
    const ok = await confirmDialog(`Supprimer le compteur "${counter.name}" et toutes ses équipes ?`, {
      title: 'Supprimer le compteur',
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    deleteCounter(counter.id);
    navigate(HOME_HASH);
  });

  const nameInput = byId<HTMLInputElement>('counter-name-input');
  nameInput.addEventListener('input', () => {
    const counter = currentScoreCounter();
    if (!counter) return;
    counter.name = nameInput.value;
    saveState();
  });

  byId('btn-add-team').addEventListener('click', () => {
    const counter = currentScoreCounter();
    if (!counter) return;
    addTeam(counter);
    renderTeams(counter);
  });

  const targetInput = byId<HTMLInputElement>('target-score-input');
  targetInput.addEventListener('change', () => {
    const counter = currentScoreCounter();
    if (!counter) return;
    const value = parseInt(targetInput.value.trim(), 10);
    counter.targetScore = Number.isNaN(value) || value <= 0 ? null : value;
    targetInput.value = counter.targetScore ? String(counter.targetScore) : '';
    saveState();
    renderTeams(counter);
  });

  byId('btn-reset-scores').addEventListener('click', () => {
    const counter = currentScoreCounter();
    if (!counter) return;
    if (!confirm('Réinitialiser tous les scores de ce compteur ?')) return;
    // L'instantané est pris avant l'ajout à l'historique : « Annuler » retire aussi la partie enregistrée.
    pushUndo(counter, 'Scores réinitialisés');
    logMatchToHistory(counter);
    resetScores(counter);
    counter.servingTeamId = null;
    forgetLeader(counter.id);
    saveState();
    renderTeams(counter);
  });

  bindModalButton('btn-open-settings', 'modal-counter-settings', 'open');
  bindModalButton('btn-close-settings', 'modal-counter-settings', 'close');

  byId('btn-open-history').addEventListener('click', () => {
    const counter = currentScoreCounter();
    if (counter) openHistory(counter);
  });
  bindModalButton('btn-close-history', 'modal-history', 'close');
}
