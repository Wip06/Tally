import { registerServiceWorker, setupInstallPrompt } from './pwa';
import { isCurrent } from './session';
import { initColorPicker } from './ui/color-picker';
import { initDetailView } from './ui/detail';
import { byId } from './ui/dom';
import { initModals } from './ui/modals';
import { initNewCounterModal } from './ui/new-counter';
import { renderTeams } from './ui/teams';
import { initTheme } from './ui/theme';
import { initTimerView } from './ui/timer';
import { undoLastAction } from './ui/undo';
import { initModeSwitch, initRouter, refreshView } from './ui/views';

function init(): void {
  initTheme(refreshView);
  initModals();
  initColorPicker();
  initNewCounterModal();
  initDetailView();
  initTimerView();
  initModeSwitch();

  byId('btn-undo').addEventListener('click', () => {
    const counter = undoLastAction();
    if (counter && isCurrent(counter)) renderTeams(counter);
  });

  initRouter();
  setupInstallPrompt();
  registerServiceWorker();
}

document.addEventListener('DOMContentLoaded', init);
