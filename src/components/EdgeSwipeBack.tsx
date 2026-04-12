'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isStandalone } from '@/hooks/usePwaInstall';

// Left-edge swipe-to-go-back, iOS native style.
// Only active when the app is running in standalone PWA mode — regular
// browser tabs keep their own back button / gesture and we don't want to
// intercept those.
//
// Trigger rules:
//   - Touch must START within EDGE_PX of the left viewport edge.
//   - Commit on either: horizontal drag > COMMIT_RATIO of viewport width,
//     or flick velocity > COMMIT_VELOCITY px/ms.
//   - Vertical deviation greater than horizontal → abort (user was scrolling).
//
// When there is no history to go back to, the gesture opens the sidebar drawer
// via a custom event the layout listens for.

const EDGE_PX = 24;
const COMMIT_RATIO = 0.30;
const COMMIT_VELOCITY = 0.5;
const AXIS_LOCK_DEADZONE = 10;

interface DragState {
  startX: number;
  startY: number;
  startT: number;
  dx: number;
  dy: number;
  axis: 'x' | 'y' | null;
  active: boolean;
}

export const OPEN_DRAWER_EVENT = 'onlybae:open-drawer';

export default function EdgeSwipeBack({ onRoot }: { onRoot?: () => void }) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [indicator, setIndicator] = useState(0);

  useEffect(() => {
    setActive(isStandalone());
    // display-mode can flip during a session (e.g. new-install).
    const media = window.matchMedia('(display-mode: standalone)');
    const onChange = () => setActive(isStandalone());
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    if (!active) return;

    let drag: DragState | null = null;

    const clearDrag = () => {
      drag = null;
      setIndicator(0);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      if (t.clientX > EDGE_PX) return;
      drag = {
        startX: t.clientX,
        startY: t.clientY,
        startT: Date.now(),
        dx: 0,
        dy: 0,
        axis: null,
        active: true,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!drag) return;
      const t = e.touches[0];
      drag.dx = t.clientX - drag.startX;
      drag.dy = t.clientY - drag.startY;

      if (!drag.axis) {
        if (Math.abs(drag.dx) > AXIS_LOCK_DEADZONE || Math.abs(drag.dy) > AXIS_LOCK_DEADZONE) {
          // Bail out if the user is scrolling vertically — this is not a back-gesture.
          if (Math.abs(drag.dy) > Math.abs(drag.dx)) {
            clearDrag();
            return;
          }
          drag.axis = 'x';
        }
      }

      if (drag.axis === 'x' && drag.dx > 0) {
        // Prevent the page from rubber-banding under the finger. Only
        // preventDefault once we've committed to the axis; before that the
        // user might still be trying to scroll the content.
        if (e.cancelable) e.preventDefault();
        const vw = window.innerWidth;
        // Show a thin accent strip on the left edge that grows with drag,
        // capped at full commit threshold.
        const progress = Math.min(1, drag.dx / (vw * COMMIT_RATIO));
        setIndicator(progress);
      }
    };

    const onTouchEnd = () => {
      if (!drag || !drag.axis) {
        clearDrag();
        return;
      }

      const elapsed = Math.max(1, Date.now() - drag.startT);
      const velocity = drag.dx / elapsed;
      const vw = window.innerWidth;
      const shouldCommit = drag.dx / vw > COMMIT_RATIO || velocity > COMMIT_VELOCITY;

      if (shouldCommit) {
        // Prefer history.back(); if we're at the root, open the drawer instead.
        const hasHistory = typeof window !== 'undefined' && window.history.length > 1;
        if (hasHistory) {
          router.back();
        } else {
          // Let the layout decide what "root" means (open drawer, go to /browse, etc.).
          window.dispatchEvent(new CustomEvent(OPEN_DRAWER_EVENT));
          onRoot?.();
        }
      }

      clearDrag();
    };

    const onTouchCancel = () => clearDrag();

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchCancel);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [active, router, onRoot]);

  if (!active || indicator === 0) return null;

  // Visual feedback: a thin accent bar on the left that grows with the drag.
  // Fades in quickly so the user feels the gesture being recognized.
  return (
    <div
      aria-hidden
      className="fixed left-0 top-0 bottom-0 z-[100] pointer-events-none"
      style={{
        width: `${Math.round(indicator * 48)}px`,
        background: 'linear-gradient(to right, rgba(234, 179, 8, 0.6), rgba(234, 179, 8, 0))',
        transition: 'opacity 120ms ease-out',
        opacity: 0.4 + indicator * 0.6,
      }}
    />
  );
}
