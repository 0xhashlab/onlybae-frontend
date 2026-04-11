'use client';

import ReelFeed from '@/components/reels/ReelFeed';

// Reels takes over the viewport. Positioned `fixed` so the layout's
// default padding/container doesn't interfere with the feed.
//
// Desktop: sits to the right of the 14rem sidebar, full height.
// Mobile:  sits between the top bar (3.5rem) and the bottom tab bar
//          (approx 4rem plus the iOS home-indicator safe area).
export default function ReelsPage() {
  return (
    <div className="reels-shell fixed left-0 md:left-56 right-0 top-14 md:top-0 bg-black overflow-hidden">
      <style jsx>{`
        .reels-shell {
          bottom: calc(4rem + env(safe-area-inset-bottom));
        }
        @media (min-width: 768px) {
          .reels-shell { bottom: 0; }
        }
      `}</style>
      <ReelFeed />
    </div>
  );
}
