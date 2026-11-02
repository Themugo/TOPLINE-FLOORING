import { useSyncExternalStore } from 'react';

/**
 * Installable web app support: install prompt capture, service-worker registration and update flow.
 * The service worker itself lives in public/sw.js (conservative: static files only, see header there).
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaState {
  installEvent: BeforeInstallPromptEvent | null;
  installed: boolean;
  waiting: ServiceWorker | null;
}

let state: PwaState = { installEvent: null, installed: false, waiting: null };
const listeners = new Set<() => void>();

function setState(patch: Partial<PwaState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)').matches === true || nav.standalone === true;
}

export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios && /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);
}

const SNOOZE_KEY = 'topline-pwa-prompt-snoozed-until';

export function isPromptSnoozed(): boolean {
  try {
    return Number(window.localStorage.getItem(SNOOZE_KEY) || 0) > Date.now();
  } catch {
    return false;
  }
}

export function snoozePrompt(days: number) {
  try {
    window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + days * 86_400_000));
  } catch {
    // Storage unavailable: the prompt may reappear next visit, which is acceptable.
  }
}

let started = false;

/** Call once at startup: captures the install prompt and registers the service worker (production only). */
export function initPwa() {
  if (started || typeof window === 'undefined') return;
  started = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    setState({ installEvent: event as BeforeInstallPromptEvent });
  });
  window.addEventListener('appinstalled', () => setState({ installEvent: null, installed: true }));

  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  const register = () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        const track = (worker: ServiceWorker | null) => {
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) setState({ waiting: worker });
          });
        };
        if (registration.waiting && navigator.serviceWorker.controller) setState({ waiting: registration.waiting });
        registration.addEventListener('updatefound', () => track(registration.installing));
        // An installed app can stay open for days: look for a new version whenever it returns to the foreground.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') void registration.update().catch(() => undefined);
        });
      })
      .catch(() => undefined); // The site works fully without a service worker.
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = state.installEvent;
  if (!event) return 'unavailable';
  await event.prompt();
  const { outcome } = await event.userChoice;
  setState({ installEvent: null });
  return outcome;
}

export function applyUpdate() {
  const worker = state.waiting;
  if (!worker) return;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
  worker.postMessage({ type: 'SKIP_WAITING' });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;

export function usePwa() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
