import { byId } from './ui/dom';

/** Événement non standard (Chromium) proposant l'installation de la PWA. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function setupInstallPrompt(): void {
  let deferredPrompt: BeforeInstallPromptEvent | null = null;
  const banner = byId('install-banner');

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    banner.hidden = false;
  });

  byId('btn-install').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    banner.hidden = true;
  });

  byId('btn-dismiss-install').addEventListener('click', () => {
    banner.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    banner.hidden = true;
  });
}

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn("Échec de l'enregistrement du service worker", err);
    });
  });
}
