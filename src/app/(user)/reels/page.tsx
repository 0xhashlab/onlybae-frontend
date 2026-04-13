'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ReelFeed from '@/components/reels/ReelFeed';
import ReelsTabs from '@/components/reels/ReelsTabs';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

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

  // Toggle every overlay (actions, info, progress, mute) so viewers can see
  // the full frame. The toggle button itself stays visible — otherwise the
  // chrome would be one-way-hidden with no way back.
  const [chromeVisible, setChromeVisible] = useState(true);

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

      <ReelFeed seriesId={seriesId} startEpisodeId={startEpisodeId} chromeVisible={chromeVisible} />

      {/* Top-center For You / Browse All tabs. In scoped mode a specific
          series is playing, so tabs are irrelevant; the Back pill replaces
          them. Also hidden in UI-off mode. */}
      {!inSeriesMode && chromeVisible && <ReelsTabs variant="overlay" />}

      {/* Scoped-mode back control, top-left with text. Only when a specific
          series is being played. Hidden when the viewer is in UI-off mode. */}
      {inSeriesMode && chromeVisible && (
        <button
          onClick={() => router.push('/reels/browse')}
          aria-label="Back to all reels"
          className="absolute z-20 flex items-center gap-2 h-9 pl-2 pr-3 rounded-full bg-black/60 backdrop-blur text-white text-sm cursor-pointer"
          style={{ top: 'calc(1rem + env(safe-area-inset-top))', left: '1rem' }}
        >
          <FontAwesomeIcon icon={faArrowLeft} className="w-3.5 h-3.5" />
          Back
        </button>
      )}

      {/* UI-visibility toggle, top-right with text. Always visible regardless
          of chromeVisible so the user can always get the UI back. */}
      <button
        onClick={() => setChromeVisible((v) => !v)}
        aria-label={chromeVisible ? 'Hide UI' : 'Show UI'}
        className="absolute z-30 flex items-center gap-2 h-9 pl-3 pr-4 rounded-full bg-black/60 backdrop-blur text-white text-sm cursor-pointer"
        style={{ top: 'calc(1rem + env(safe-area-inset-top))', right: '1rem' }}
      >
        <FontAwesomeIcon icon={chromeVisible ? faEyeSlash : faEye} className="w-4 h-4" />
        {chromeVisible ? 'Hide UI' : 'Show UI'}
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
