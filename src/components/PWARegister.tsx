'use client';

import { useEffect } from 'react';

// Service worker update strategy:
//
// 1. Register /sw.js on window load (production only — dev HMR fights caching).
// 2. When a new SW finishes installing while an old one is controlling the page,
//    tell it to skipWaiting() so it becomes active immediately.
// 3. When the new SW takes control (controllerchange), silently reload the page
//    — but only when the tab is hidden, so we never interrupt the user.
//    If the tab is visible, defer the reload until the next visibility change.
// 4. Periodically call registration.update() every UPDATE_INTERVAL_MS so users
//    who keep a tab open all day don't get stuck on stale code.
//
// End result: most users get the new code within a few hours, without ever
// seeing a "refresh to update" banner.

const UPDATE_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

export default function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    let intervalId: number | null = null;
    let pendingReload = false;

    const scheduleReload = () => {
      // Already scheduled? Don't double-up.
      if (pendingReload) return;
      pendingReload = true;

      const reloadIfHidden = () => {
        if (document.visibilityState === 'hidden') {
          window.location.reload();
        } else {
          // Wait for the tab to become hidden (user switches away / locks phone).
          document.addEventListener('visibilitychange', onVisibility, { once: true });
        }
      };
      const onVisibility = () => {
        if (document.visibilityState === 'hidden') {
          window.location.reload();
        }
      };
      reloadIfHidden();
    };

    // New SW took over — schedule a silent reload at the next safe moment.
    const handleControllerChange = () => {
      scheduleReload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          // If a worker is already waiting when we register, activate it now.
          if (registration.waiting && navigator.serviceWorker.controller) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }

          // When a new worker is found mid-session, skip the waiting phase
          // as soon as it finishes installing.
          registration.addEventListener('updatefound', () => {
            const nw = registration.installing;
            if (!nw) return;
            nw.addEventListener('statechange', () => {
              if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                nw.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          });

          // Poll for updates every few hours so long-lived tabs don't go stale.
          intervalId = window.setInterval(() => {
            registration.update().catch(() => { /* best effort */ });
          }, UPDATE_INTERVAL_MS);

          // Also check immediately when the tab regains focus after being hidden
          // for a while — common on mobile where users switch apps constantly.
          const onVisibility = () => {
            if (document.visibilityState === 'visible') {
              registration.update().catch(() => { /* best effort */ });
            }
          };
          document.addEventListener('visibilitychange', onVisibility);
        })
        .catch((err) => {
          console.warn('Service worker registration failed:', err);
        });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, []);

  return null;
}
