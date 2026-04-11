'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExpand, faCompress } from '@fortawesome/free-solid-svg-icons';

interface MediaPlayerProps {
  url: string;
  width?: number | null;
  height?: number | null;
  orientation?: 'portrait' | 'landscape' | 'square' | null;
  poster?: string | null;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
}

// Browser-vendor-prefixed fullscreen API surface we care about.
type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
  webkitEnterFullscreen?: () => void; // iOS Safari (video element only)
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
};

// Single source of truth for video playback across the app.
// Uses the width/height metadata stored on ContentItem to render the correct
// aspect ratio (vertical for reels, horizontal for normal videos).
// Falls back to 16/9 when metadata is missing.
export default function MediaPlayer({
  url,
  width,
  height,
  orientation,
  poster,
  autoPlay = false,
  loop = false,
  muted = false,
  controls = true,
  className = '',
}: MediaPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const aspectRatio = width && height
    ? `${width} / ${height}`
    : orientation === 'portrait'
      ? '9 / 16'
      : orientation === 'square'
        ? '1 / 1'
        : '16 / 9';

  const isPortrait = orientation === 'portrait' || (width && height && height > width);

  // Track fullscreen state across vendor prefixes so our button can toggle correctly.
  useEffect(() => {
    const handleChange = () => {
      const doc = document as FullscreenDocument;
      const current = document.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement;
      setIsFullscreen(current === containerRef.current);
    };
    document.addEventListener('fullscreenchange', handleChange);
    document.addEventListener('webkitfullscreenchange', handleChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
      document.removeEventListener('webkitfullscreenchange', handleChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current as FullscreenElement | null;
    const doc = document as FullscreenDocument;
    const current = document.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement;

    if (current) {
      try {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
        else if (doc.msExitFullscreen) await doc.msExitFullscreen();
      } catch { /* ignore */ }
      return;
    }

    if (!container) return;

    try {
      if (container.requestFullscreen) {
        await container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) {
        await container.webkitRequestFullscreen();
      } else if (container.msRequestFullscreen) {
        await container.msRequestFullscreen();
      } else if (videoRef.current) {
        // iOS Safari only exposes fullscreen on the <video> element itself.
        const video = videoRef.current as FullscreenElement & HTMLVideoElement;
        if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
      }
    } catch { /* ignore */ }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative bg-black rounded-lg overflow-hidden mx-auto group ${className}`}
      style={
        isFullscreen
          ? { width: '100%', height: '100%', maxHeight: '100%', maxWidth: '100%' }
          : {
              aspectRatio,
              maxHeight: '80vh',
              maxWidth: isPortrait ? 'min(100%, 450px)' : '100%',
            }
      }
    >
      <video
        ref={videoRef}
        src={url}
        poster={poster ?? undefined}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        controls={controls}
        playsInline
        className="w-full h-full object-contain"
      />

      {/* Custom fullscreen button: stays out of the way but always reachable.
          Native controls still include their own fullscreen on desktop, but
          going fullscreen on the container lets us keep custom chrome for
          future additions (overlays, captions, etc.) without losing it. */}
      <button
        type="button"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/60 backdrop-blur text-white flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} className="w-4 h-4" />
      </button>
    </div>
  );
}
