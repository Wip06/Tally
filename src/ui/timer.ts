import { DEFAULT_TIMER_MINUTES } from '../constants';
import { HOME_HASH, navigate } from '../routes';
import { currentCounter, session } from '../session';
import { addTeam, deleteCounter, resetScores, saveState } from '../store';
import type { TimerCounter } from '../types';
import { celebrateTimeUp } from './celebration';
import { byId, pad2 } from './dom';
import { bindModalButton, confirmDialog } from './modals';
import { syncModeButtons } from './mode-switch';
import { forgetLeader, renderTeams } from './teams';
import { pushUndo } from './undo';

interface CountdownListener {
  onTick(): void;
  onFinish(): void;
  onRunningChange(running: boolean): void;
}

/**
 * Compte à rebours calé sur l'horloge (heure de fin) plutôt que sur le nombre de ticks :
 * il reste juste même quand le navigateur ralentit ou suspend les intervalles en arrière-plan.
 */
class Countdown {
  counterId: string | null = null;
  /** Durée totale, en secondes. */
  total = 0;
  /** Temps restant, en secondes. */
  remaining = 0;
  running = false;
  private endAt = 0;
  private intervalId: number | undefined;
  private readonly listener: CountdownListener;

  constructor(listener: CountdownListener) {
    this.listener = listener;
  }

  /** Arrête et recharge le minuteur avec la durée du compteur. */
  load(counter: TimerCounter): void {
    this.stop();
    this.counterId = counter.id;
    this.total = (counter.durationMinutes || DEFAULT_TIMER_MINUTES) * 60;
    this.remaining = this.total;
    this.listener.onTick();
  }

  start(): void {
    if (this.running || this.remaining <= 0) return;
    this.running = true;
    this.endAt = Date.now() + this.remaining * 1000;
    this.listener.onRunningChange(true);
    this.intervalId = window.setInterval(() => this.tick(), 1000);
  }

  stop(): void {
    if (this.running) this.remaining = this.secondsLeft();
    this.running = false;
    clearInterval(this.intervalId);
    this.intervalId = undefined;
    this.listener.onRunningChange(false);
  }

  toggle(): void {
    if (this.running) this.stop();
    else this.start();
  }

  /** Recalcule le temps restant. Appelé chaque seconde et au retour au premier plan. */
  tick(): void {
    if (!this.running) return;
    this.remaining = this.secondsLeft();
    this.listener.onTick();
    if (this.remaining <= 0) {
      this.stop();
      this.listener.onFinish();
    }
  }

  /** Arrête le minuteur s'il appartient à ce compteur (avant suppression). */
  release(counterId: string): void {
    if (this.counterId === counterId) this.stop();
  }

  private secondsLeft(): number {
    return Math.max(0, Math.round((this.endAt - Date.now()) / 1000));
  }
}

// ---------- Vue ----------

const RING_RADIUS = 90;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const countdown = new Countdown({
  onTick: () => { if (isOnScreen()) updateDisplay(); },
  onFinish: () => { if (isOnScreen()) celebrateTimeUp(); },
  onRunningChange: running => { byId('btn-timer-toggle').textContent = running ? 'Pause' : 'Démarrer'; },
});

/** Le minuteur en cours est-il celui affiché ? Il continue de tourner quand on quitte la vue. */
function isOnScreen(): boolean {
  return session.currentCounterId !== null && session.currentCounterId === countdown.counterId;
}

function updateDisplay(): void {
  const remaining = Math.max(0, countdown.remaining);
  byId('timer-big-display').textContent = `${pad2(Math.floor(remaining / 60))}:${pad2(Math.floor(remaining % 60))}`;
  const ratio = countdown.total > 0 ? remaining / countdown.total : 0;
  const progress = byId<SVGCircleElement>('timer-ring-progress');
  progress.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - ratio));
  progress.classList.toggle('timer-ring__progress--done', remaining <= 0);
}

export function renderTimerView(counter: TimerCounter): void {
  byId<HTMLInputElement>('timer-name-input').value = counter.name;
  byId<HTMLInputElement>('timer-duration-input').value = String(counter.durationMinutes);
  syncModeButtons(counter.mode);
  byId<SVGCircleElement>('timer-ring-progress').style.strokeDasharray = String(RING_CIRCUMFERENCE);

  if (countdown.counterId !== counter.id) countdown.load(counter);
  else updateDisplay();

  renderTeams(counter);
}

function currentTimer(): TimerCounter | null {
  const counter = currentCounter();
  return counter?.type === 'timer' ? counter : null;
}

export function initTimerView(): void {
  // Les intervalles sont suspendus en arrière-plan : on rattrape le retard dès le retour.
  const catchUp = () => countdown.tick();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') catchUp();
  });
  window.addEventListener('focus', catchUp);
  window.addEventListener('pageshow', catchUp);

  byId('btn-timer-back').addEventListener('click', () => navigate(HOME_HASH));

  byId('btn-timer-delete').addEventListener('click', async () => {
    const timer = currentTimer();
    if (!timer) return;
    const ok = await confirmDialog(`Supprimer le minuteur "${timer.name}" ?`, {
      title: 'Supprimer le minuteur',
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    countdown.release(timer.id);
    deleteCounter(timer.id);
    navigate(HOME_HASH);
  });

  const nameInput = byId<HTMLInputElement>('timer-name-input');
  nameInput.addEventListener('input', () => {
    const timer = currentTimer();
    if (!timer) return;
    timer.name = nameInput.value;
    saveState();
  });

  byId('btn-timer-toggle').addEventListener('click', () => countdown.toggle());

  byId('btn-timer-reset').addEventListener('click', () => {
    const timer = currentTimer();
    if (timer) countdown.load(timer);
  });

  bindModalButton('btn-timer-settings', 'modal-timer-settings', 'open');
  bindModalButton('btn-close-timer-settings', 'modal-timer-settings', 'close');

  const durationInput = byId<HTMLInputElement>('timer-duration-input');
  durationInput.addEventListener('change', () => {
    const timer = currentTimer();
    if (!timer) return;
    const value = parseInt(durationInput.value.trim(), 10);
    timer.durationMinutes = Number.isNaN(value) || value <= 0 ? DEFAULT_TIMER_MINUTES : value;
    durationInput.value = String(timer.durationMinutes);
    saveState();
    countdown.load(timer);
  });

  byId('btn-timer-add-team').addEventListener('click', () => {
    const timer = currentTimer();
    if (!timer) return;
    addTeam(timer);
    renderTeams(timer);
  });

  byId('btn-timer-reset-scores').addEventListener('click', () => {
    const timer = currentTimer();
    if (!timer) return;
    if (!confirm('Réinitialiser tous les scores ?')) return;
    pushUndo(timer, 'Scores réinitialisés');
    resetScores(timer);
    forgetLeader(timer.id);
    saveState();
    renderTeams(timer);
  });
}
