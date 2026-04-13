'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ReelFeed from '@/components/reels/ReelFeed';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGrip, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

// Reels takes over the viewport. Positioned `fixed` so the layout's
// default padding/container doesn't interfere with the feed.
//
// URL params:
//   ?seriesId=X   Scope the feed to a single reels series, ordered by ep number.
//   ?start=Y      Start playback at episode Y (auto-scroll when the feed loads).
//
// Desktop: sits to the right of the 14rem sidebar, full height.
// Mobile:  sits between the top bar (3.5rem + Dynamic Island / notch safe area)
//          and the bottom tab bar (4rem + iOS home-indicator safe area).
function ReelsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const seriesId = searchParams.get('seriesId') || undefined;
  const startEpisodeId = searchParams.get('start') || undefined;
  const inSeriesMode = Boolean(seriesId);

  return (
    <div className="reels-shell fixed left-0 md:left-56 right-0 bg-black overflow-hidden">
      <style jsx>{`
        .reels-shell {
          top: calc(3.5rem + env(safe-area-inset-top));
          bottom: calc(4rem + env(safe-area-inset-bottom));
        }
        @media (min-width: 768px) {
          .reels-shell {
            top: 0;
            bottom: 0;
          }
        }
      `}</style>

      <ReelFeed seriesId={seriesId} startEpisodeId={startEpisodeId} />

      {/* Top-right corner: open the series browser (global feed only).
          In scoped feed mode, replace with a Back arrow that unscopes the feed. */}
      <button
        onClick={() => router.push(inSeriesMode ? '/reels' : '/reels/browse')}
        aria-label={inSeriesMode ? 'Back to feed' : 'Browse all reels'}
        className="absolute z-20 w-10 h-10 rounded-full bg-black/50 backdrop-blur text-white flex items-center justify-center cursor-pointer"
        style={{ top: 'calc(1rem + env(safe-area-inset-top))', left: '1rem' }}
      >
        <FontAwesomeIcon icon={inSeriesMode ? faArrowLeft : faGrip} className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function ReelsPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-black" />}>
      <ReelsPageInner />
    </Suspense>
  );
}
