import { createBackup, parseBackup } from '../backup';
import { replaceAllCounters, state } from '../store';
import { currentTheme } from '../themes';
import { byId } from './dom';
import { confirmDialog } from './modals';
import { setThemeWithoutRemap } from './theme';

function plural(count: number, word: string): string {
  return `${count} ${word}${count > 1 ? 's' : ''}`;
}

function showStatus(message: string, tone: 'ok' | 'error'): void {
  const status = byId('backup-status');
  status.textContent = message;
  status.dataset.tone = tone;
  status.hidden = false;
}

/** Remet la section « Sauvegarde » dans son état initial (à l'ouverture des réglages). */
export function resetBackupPanel(): void {
  byId('backup-status').hidden = true;
  byId('backup-output').hidden = true;
  byId('backup-restore-panel').hidden = true;
  byId<HTMLTextAreaElement>('backup-input').value = '';
}

async function copyBackup(): Promise<void> {
  const text = createBackup(state.counters, currentTheme().id);
  const output = byId<HTMLTextAreaElement>('backup-output');
  try {
    await navigator.clipboard.writeText(text);
    output.hidden = true;
    showStatus(
      `Sauvegarde copiée (${plural(state.counters.length, 'compteur')}). Colle-la dans « Restaurer » sur la nouvelle app, ou dans tes notes pour la garder.`,
      'ok',
    );
  } catch {
    // Presse-papiers refusé : on affiche le texte pour une copie à la main.
    output.value = text;
    output.hidden = false;
    output.focus();
    output.select();
    showStatus('Copie automatique impossible : sélectionne tout le texte ci-dessous et copie-le.', 'error');
  }
}

async function restoreBackup(onRestored: () => void): Promise<void> {
  const input = byId<HTMLTextAreaElement>('backup-input');
  const parsed = parseBackup(input.value);
  if (!parsed.ok) {
    showStatus(parsed.error, 'error');
    return;
  }

  if (state.counters.length) {
    const ok = await confirmDialog(
      `Remplacer tes ${plural(state.counters.length, 'compteur')} actuels par les ${parsed.counters.length} de la sauvegarde ?`,
      { title: 'Restaurer la sauvegarde', confirmLabel: 'Remplacer' },
    );
    if (!ok) return;
  }

  const count = replaceAllCounters(parsed.counters);
  if (parsed.theme) setThemeWithoutRemap(parsed.theme, onRestored);
  input.value = '';
  byId('backup-restore-panel').hidden = true;
  onRestored();
  showStatus(`Sauvegarde restaurée : ${plural(count, 'compteur')}, historique compris.`, 'ok');
}

/** Section « Sauvegarde » des réglages : copier ses données, ou restaurer celles d'une autre installation. */
export function initBackup(onRestored: () => void): void {
  byId('btn-backup-copy').addEventListener('click', () => void copyBackup());

  byId('btn-backup-restore').addEventListener('click', () => {
    const panel = byId('backup-restore-panel');
    panel.hidden = !panel.hidden;
    byId('backup-status').hidden = true;
    if (!panel.hidden) byId('backup-input').focus();
  });

  byId('btn-backup-apply').addEventListener('click', () => void restoreBackup(onRestored));
}
