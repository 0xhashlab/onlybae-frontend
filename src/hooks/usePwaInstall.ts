'use client';

import { useEffect, useState, useCallback } from 'react';

// Chrome/Edge/Android fire `beforeinstallprompt` once per page load and
// discard it if nobody calls preventDefault(). Multiple components may want
// to trigger install (a subtle banner, an explicit Profile page button, etc),
// so we capture the event on `window` and let every consumer read it.
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __onlybaePwaInstallEvent?: BeforeInstallPromptEvent | null;
  }
}

const EVENT_CAPTURED = 'onlybae:pwa-install-event-captured';
const INSTALLED = 'onlybae:pwa-app-installed';

export const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  const navStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia('(display-mode: standalone)').matches || navStandalone === true;
};

export const isIosSafari = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
};

// Install a single global listener (idempotent) that stores the event on
// window and rebroadcasts a custom event so React components can react.
let listenerInstalled = false;
const ensureGlobalListener = () => {
  if (listenerInstalled || typeof window === 'undefined') return;
  listenerInstalled = true;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.__onlybaePwaInstallEvent = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent(EVENT_CAPTURED));
  });

  window.addEventListener('appinstalled', () => {
    window.__onlybaePwaInstallEvent = null;
    window.dispatchEvent(new CustomEvent(INSTALLED));
  });
};

export interface UsePwaInstall {
  /** True when the app is already running in standalone / installed mode. */
  installed: boolean;
  /** True when the browser has supplied a usable install prompt event. */
  canPromptInstall: boolean;
  /** True for iOS Safari — there is no programmatic install API, user must use the Share sheet. */
  needsIosInstructions: boolean;
  /** Fires the native install prompt (Chrome / Android / Edge). No-op if unavailable. */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

export function usePwaInstall(): UsePwaInstall {
  const [installed, setInstalled] = useState<boolean>(() => isStandalone());
  const [hasEvent, setHasEvent] = useState<boolean>(() =>
    typeof window !== 'undefined' && !!window.__onlybaePwaInstallEvent
  );

  useEffect(() => {
    ensureGlobalListener();

    // Sync initial state in case the listener captured before we mounted.
    setHasEvent(!!window.__onlybaePwaInstallEvent);
    setInstalled(isStandalone());

    const onCaptured = () => setHasEvent(true);
    const onInstalled = () => {
      setHasEvent(false);
      setInstalled(true);
    };
    window.addEventListener(EVENT_CAPTURED, onCaptured);
    window.addEventListener(INSTALLED, onInstalled);

    // display-mode can flip if the user installs and relaunches quickly.
    const media = window.matchMedia('(display-mode: standalone)');
    const onModeChange = () => setInstalled(isStandalone());
    media.addEventListener?.('change', onModeChange);

    return () => {
      window.removeEventListener(EVENT_CAPTURED, onCaptured);
      window.removeEventListener(INSTALLED, onInstalled);
      media.removeEventListener?.('change', onModeChange);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const event = typeof window !== 'undefined' ? window.__onlybaePwaInstallEvent : null;
    if (!event) return 'unavailable';
    try {
      await event.prompt();
      const { outcome } = await event.userChoice;
      // beforeinstallprompt can only fire once per page load. Clear it so other
      // callers know the user has responded already.
      window.__onlybaePwaInstallEvent = null;
      window.dispatchEvent(new CustomEvent(INSTALLED));
      return outcome;
    } catch {
      return 'unavailable';
    }
  }, []);

  return {
    installed,
    canPromptInstall: hasEvent && !installed,
    needsIosInstructions: !installed && isIosSafari() && !hasEvent,
    promptInstall,
  };
}
