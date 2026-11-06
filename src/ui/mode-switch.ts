import type { ScoreMode } from '../types';

/** Met en surbrillance le mode actif dans les sélecteurs de mode (réglages compteur et minuteur). */
export function syncModeButtons(mode: ScoreMode): void {
  document.querySelectorAll<HTMLButtonElement>('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
}
