import { initBackup, resetBackupPanel } from './backup';
import { byId } from './dom';
import { closeModal, openModal, type ModalId } from './modals';
import { initTheme, renderThemeOptions } from './theme';

/**
 * Réglages de l'application (thème, sauvegarde), ouverts depuis l'en-tête
 * ou depuis les réglages d'un compteur ou d'un minuteur.
 * `onChange` re-rend la vue affichée (couleurs d'équipe modifiées, données restaurées).
 */
export function initAppSettings(onChange: () => void): void {
  initTheme();
  initBackup(onChange);
  byId('app-version').textContent = `Version ${__APP_VERSION__}`;

  const open = (from?: ModalId) => {
    if (from) closeModal(from);
    renderThemeOptions(onChange);
    resetBackupPanel();
    openModal('modal-app-settings');
  };

  byId('btn-open-app-settings').addEventListener('click', () => open());
  document.querySelectorAll<HTMLButtonElement>('[data-open-app-settings]').forEach(btn => {
    btn.addEventListener('click', () => open(btn.closest<HTMLElement>('.modal-overlay')?.id as ModalId | undefined));
  });
  byId('btn-close-app-settings').addEventListener('click', () => closeModal('modal-app-settings'));
}
