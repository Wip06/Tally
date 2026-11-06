import { BANNER_TIMEOUT_MS, CONFETTI_COUNT } from '../constants';
import { targetScoreOf } from '../scoring';
import { teamPalette } from '../themes';
import type { Counter, Team } from '../types';
import { byId, h } from './dom';

let bannerTimer: number | undefined;

function celebrate(message: string): void {
  const banner = byId('win-banner');
  banner.textContent = message;
  banner.hidden = false;
  clearTimeout(bannerTimer);
  bannerTimer = window.setTimeout(() => { banner.hidden = true; }, BANNER_TIMEOUT_MS);
  spawnConfetti();
}

/** Célèbre si `team` vient de franchir l'objectif du compteur. */
export function checkWinCondition(counter: Counter, team: Team, previousScore: number): void {
  const target = targetScoreOf(counter);
  if (target !== null && team.score >= target && previousScore < target) {
    celebrate(`${team.name} atteint l'objectif !`);
  }
}

export function celebrateTimeUp(): void {
  celebrate('Temps écoulé !');
}

function spawnConfetti(): void {
  const layer = byId('confetti-layer');
  const palette = teamPalette();
  for (let i = 0; i < CONFETTI_COUNT; i++) {
    const duration = 2 + Math.random() * 1.5;
    const piece = h('span', {
      className: 'confetti-piece',
      style: {
        left: `${Math.random() * 100}vw`,
        background: palette[Math.floor(Math.random() * palette.length)],
        'animation-duration': `${duration}s`,
        'animation-delay': `${Math.random() * 0.3}s`,
      },
    });
    layer.appendChild(piece);
    window.setTimeout(() => piece.remove(), (duration + 0.3) * 1000);
  }
}
