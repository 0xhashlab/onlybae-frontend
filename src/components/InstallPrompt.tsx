'use client';

import { useEffect, useState } from 'react';
import { usePwaInstall } from '@/hooks/usePwaInstall';

// Subtle banner that auto-shows on first visit to encourage installation.
// Explicit install button lives on the Profile page via AddToHomeScreenButton;
// this banner is for discovery when the user hasn't dug into settings yet.

type Mode = 'hidden' | 'install-button' | 'ios-hint';

const DISMISS_KEY = 'onlybae:pwa:install-dismissed';
// Re-prompt after a week if the user dismissed but never installed.
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export default function InstallPrompt() {
  const { installed, canPromptInstall, needsIosInstructions, promptInstall } = usePwaInstall();
  const [mode, setMode] = useState<Mode>('hidden');

  useEffect(() => {
    if (installed) {
      setMode('hidden');
      return;
    }

    // Respect recent dismissal.
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const dismissedAt = Number(raw);
        if (Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_TTL_MS) {
          setMode('hidden');
          return;
        }
      }
    } catch { /* ignore */ }

    if (canPromptInstall) {
      setMode('install-button');
    } else if (needsIosInstructions) {
      // iOS: show the hint after a short delay so it doesn't shout on first paint.
      const timer = window.setTimeout(() => setMode('ios-hint'), 3000);
      return () => window.clearTimeout(timer);
    } else {
      setMode('hidden');
    }
  }, [installed, canPromptInstall, needsIosInstructions]);

  if (mode === 'hidden') return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setMode('hidden');
  };

  const install = async () => {
    const outcome = await promptInstall();
    if (outcome === 'accepted') {
      setMode('hidden');
    } else {
      dismiss();
    }
  };

  return (
    <div
      className="fixed left-3 right-3 md:left-auto md:right-4 md:max-w-sm z-[80] pointer-events-none"
      style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
    >
      <div className="pointer-events-auto bg-surface border border-border rounded-2xl p-3 shadow-2xl flex items-start gap-3">
        <img src="/logo.jpg" alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
        <div className="flex-1 min-w-0">
          {mode === 'install-button' ? (
            <>
              <p className="text-sm font-semibold text-foreground">Install OnlyBae</p>
              <p className="text-xs text-muted mt-0.5">Full-screen experience, no browser bars.</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={install}
                  className="h-8 px-3 rounded-lg bg-accent text-white text-xs font-semibold cursor-pointer"
                >
                  Install
                </button>
                <button
                  onClick={dismiss}
                  className="h-8 px-3 rounded-lg bg-surface-hover text-foreground text-xs font-medium cursor-pointer"
                >
                  Not now
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground">Add to Home Screen</p>
              <p className="text-xs text-muted mt-0.5 leading-relaxed">
                Tap <span className="inline-flex items-center"><ShareIcon /></span> in Safari, then <strong className="text-foreground">Add to Home Screen</strong>.
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={dismiss}
                  className="h-8 px-3 rounded-lg bg-surface-hover text-foreground text-xs font-medium cursor-pointer"
                >
                  Got it
                </button>
              </div>
            </>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="w-7 h-7 flex items-center justify-center text-muted hover:text-foreground cursor-pointer shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// iOS Safari share icon (up arrow out of a box) — inline SVG so it always renders.
function ShareIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block -translate-y-[1px]"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m8 7 4-4 4 4" />
      <rect x="4" y="15" width="16" height="6" rx="2" />
    </svg>
  );
}
