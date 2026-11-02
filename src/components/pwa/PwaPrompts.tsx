import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Download, RefreshCw, Share, X } from 'lucide-react';
import {
  applyUpdate,
  isIosSafari,
  isPromptSnoozed,
  isStandalone,
  promptInstall,
  snoozePrompt,
  usePwa,
} from '@/lib/pwa';

const QUIET_ROUTES = ['/cart', '/checkout', '/payment-return', '/order-confirmation'];
const SHOW_AFTER_MS = 20_000;
// Staff who just signed in to the admin area are offered the app almost immediately.
const ADMIN_SHOW_AFTER_MS = 1_500;

/**
 * Two small, dismissible prompts: "Install app" (Android/desktop Chrome via beforeinstallprompt, or Add-to-Home-Screen
 * guidance on iOS Safari) and "Update available". Both stay out of checkout/payment screens.
 */
export function PwaPrompts() {
  const { installEvent, waiting } = usePwa();
  const [location] = useLocation();
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  const admin = location.startsWith('/admin') && !location.startsWith('/admin/login');

  useEffect(() => {
    if (isStandalone() || isPromptSnoozed()) return;
    const timer = window.setTimeout(() => {
      setReady(true);
      if (isIosSafari()) setIosHint(true);
    }, admin ? ADMIN_SHOW_AFTER_MS : SHOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [admin]);

  if (QUIET_ROUTES.some((r) => location.startsWith(r)) || location.startsWith('/admin/login')) return null;

  const position = admin
    ? 'bottom-[max(1rem,env(safe-area-inset-bottom))]'
    : 'bottom-[calc(5.25rem+env(safe-area-inset-bottom))] md:bottom-4';
  const shell = `fixed inset-x-3 sm:inset-x-auto sm:right-4 sm:w-96 z-[45] ${position} rounded-2xl border border-[#D8DDE4] bg-white p-4 shadow-[0_12px_40px_rgba(12,45,87,.22)]`;
  const primary =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0C2D57] px-4 text-sm font-bold text-white hover:bg-[#12396d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78] focus-visible:ring-offset-2';
  const ghost =
    'inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-semibold text-[#0C2D57] hover:bg-[#F7F6F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B78]';

  if (waiting) {
    return (
      <div role="status" aria-live="polite" className={shell}>
        <p className="flex items-center gap-2 text-sm font-bold text-[#0C2D57]"><RefreshCw className="h-4 w-4" aria-hidden="true" />A new version is ready</p>
        <p className="mt-1 text-xs text-slate-700">Update to get the latest improvements. Finish anything in progress first, the page reloads.</p>
        <div className="mt-3 flex gap-2">
          <button type="button" className={primary} onClick={applyUpdate}>Update now</button>
        </div>
      </div>
    );
  }

  if (!ready || dismissed || isStandalone()) return null;

  const close = () => {
    snoozePrompt(30);
    setDismissed(true);
  };

  if (installEvent) {
    return (
      <div role="region" aria-label="Install the Topline app" className={shell}>
        <button type="button" onClick={close} aria-label="Dismiss install prompt" className="absolute right-1 top-1 inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-[#F7F6F3]"><X className="h-4 w-4" aria-hidden="true" /></button>
        <p className="pr-10 text-sm font-bold text-[#0C2D57]">Install the Topline app</p>
        <p className="mt-1 pr-6 text-xs text-slate-700">One tap from your home screen to quotes, orders and your account.</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className={primary}
            onClick={() => {
              void promptInstall().then((outcome) => {
                if (outcome !== 'unavailable') snoozePrompt(outcome === 'accepted' ? 365 : 30);
                setDismissed(true);
              });
            }}
          >
            <Download className="h-4 w-4" aria-hidden="true" />Install
          </button>
          <button type="button" className={ghost} onClick={close}>Not now</button>
        </div>
      </div>
    );
  }

  if (iosHint) {
    return (
      <div role="region" aria-label="Add Topline to your home screen" className={shell}>
        <button type="button" onClick={close} aria-label="Dismiss home screen tip" className="absolute right-1 top-1 inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-[#F7F6F3]"><X className="h-4 w-4" aria-hidden="true" /></button>
        <p className="pr-10 text-sm font-bold text-[#0C2D57]">Add Topline to your home screen</p>
        <p className="mt-1 pr-6 text-xs text-slate-700">
          Tap <Share className="mx-0.5 inline h-3.5 w-3.5 align-text-bottom" aria-label="Share" /> in Safari, then choose <strong>Add to Home Screen</strong>.
        </p>
      </div>
    );
  }

  return null;
}
