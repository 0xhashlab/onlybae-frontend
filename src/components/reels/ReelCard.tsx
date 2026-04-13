'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faBookmark, faLock, faVolumeHigh, faVolumeXmark, faComment, faUser, faPlay } from '@fortawesome/free-solid-svg-icons';
import type { ReelItem } from '@/utils/api';
import { userApi } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

interface ReelCardProps {
  item: ReelItem;
  active: boolean;
  // Distance from the currently active card (0 = active, 1 = neighbor, etc.)
  // Used to decide whether to mount the <video> element at all.
  distance: number;
  muted: boolean;
  userPaused: boolean;
  /** When false, all overlay chrome (buttons, info, progress bar, mute) fades out. */
  chromeVisible: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onChange: (updated: ReelItem) => void;
  onVideoError?: () => void;
  onOpenComments: (id: string) => void;
}

// Distance within which we actually mount the <video> element.
// Cards further away show only the cover image — saves memory and bandwidth
// on feeds with many items.
const VIDEO_MOUNT_RADIUS = 1;

export default function ReelCard({
  item,
  active,
  distance,
  muted,
  userPaused,
  chromeVisible,
  onToggleMute,
  onTogglePause,
  onChange,
  onVideoError,
  onOpenComments,
}: ReelCardProps) {
  const router = useRouter();
  const { isAuthenticated, refreshUser } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [likeBurst, setLikeBurst] = useState(0);
  const tapTimerRef = useRef<number | null>(null);

  const shouldMountVideo = distance <= VIDEO_MOUNT_RADIUS;
  const preload = distance === 0 ? 'auto' : 'metadata';
  const shouldPlay = active && !userPaused;

  // Play/pause based on intended state.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (shouldPlay) {
      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(() => { /* autoplay blocked — user must interact */ });
    } else {
      video.pause();
    }
  }, [shouldPlay]);

  // Reset playback position when a card becomes active fresh.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      video.currentTime = 0;
      setProgress(0);
    }
  }, [active]);

  const requireAuth = useCallback(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return false;
    }
    return true;
  }, [isAuthenticated, router]);

  const handleLike = useCallback(async () => {
    if (!requireAuth()) return;
    const before = { liked: item.liked, likeCount: item.likeCount };
    onChange({ ...item, liked: !item.liked, likeCount: item.likeCount + (item.liked ? -1 : 1) });
    try {
      const res = await userApi.toggleLike(item.id);
      const d = res.data as { liked: boolean; likeCount: number };
      onChange({ ...item, liked: d.liked, likeCount: d.likeCount });
    } catch {
      onChange({ ...item, ...before });
    }
  }, [item, onChange, requireAuth]);

  const handleFavorite = async () => {
    if (!requireAuth()) return;
    const before = item.favorited;
    onChange({ ...item, favorited: !item.favorited });
    try {
      const res = await userApi.toggleFavorite(item.id);
      const d = res.data as { favorited: boolean };
      onChange({ ...item, favorited: d.favorited });
    } catch {
      onChange({ ...item, favorited: before });
    }
  };

  const handleUnlock = async () => {
    if (!requireAuth() || unlocking) return;
    setUnlocking(true);
    setError(null);
    try {
      const res = await userApi.unlockContent(item.id);
      const data = res.data as { insufficientBalance?: boolean; required?: number; current?: number } | null;
      if (data?.insufficientBalance) {
        setError(`Need ${data.required} tokens (you have ${data.current})`);
        return;
      }
      onChange({ ...item, isUnlocked: true, video: item.video ? { ...item.video, locked: false } : null });
      refreshUser?.();
    } catch (err) {
      setError((err as Error).message || 'Unlock failed');
    } finally {
      setUnlocking(false);
    }
  };

  // Single tap → pause/play. Double tap → like with burst animation.
  const handleSurfaceTap = () => {
    if (tapTimerRef.current !== null) {
      window.clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
      if (!item.liked) handleLike();
      setLikeBurst(Date.now());
    } else {
      tapTimerRef.current = window.setTimeout(() => {
        tapTimerRef.current = null;
        if (active) onTogglePause();
      }, 240);
    }
  };

  useEffect(() => {
    return () => {
      if (tapTimerRef.current !== null) window.clearTimeout(tapTimerRef.current);
    };
  }, []);

  const locked = item.video?.locked ?? !item.isUnlocked;

  // Aspect inference for fill strategy. Portrait / square videos should fill
  // the phone viewport edge-to-edge (TikTok style, cropping top/bottom when
  // the phone's aspect is narrower than the video's). Landscape videos keep
  // `object-contain` so they letterbox instead of cutting off faces.
  const videoW = item.video?.width ?? 0;
  const videoH = item.video?.height ?? 0;
  const isLandscape = videoW > 0 && videoH > 0 && videoW > videoH;
  // Desktop stage: aspect-matched box centered in the card (TikTok web style).
  // Mobile stage fills edge-to-edge; on desktop the width auto-derives from
  // `h-full` × aspect so the player matches the real video shape. Falls back
  // to 9:16 when dimensions are missing so we don't stretch across the viewport.
  // Applied via a responsive inline style below — mobile gets `auto` so the
  // default `w-full h-full` takes over with no aspect constraint.
  const stageAspect = videoW > 0 && videoH > 0 ? `${videoW} / ${videoH}` : '9 / 16';

  // Chrome fade: keep mounted (so toggles work) but fade to zero and pointer-events-none.
  const chromeClass = `transition-opacity duration-200 ${chromeVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`;

  return (
    <div
      className="relative w-full h-full overflow-hidden flex items-center justify-center bg-black"
      style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
    >
      {/* Background poster (blurred cover) — full-bleed behind the stage so
          desktop letterbox bars look like a cinema frame rather than dead
          black rails. */}
      {item.coverUrl && (
        <img
          src={item.coverUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40 blur-lg scale-110 select-none"
          draggable={false}
        />
      )}

      {/*
        Stage — the actual video frame.
        Mobile (< md): fills the entire card (w-full h-full). The video
          inside uses object-cover for portrait (TikTok-style edge-to-edge
          crop) and object-contain for landscape (letterbox).
        Desktop (md+): height fills the card, width is derived from the
          video's real aspect ratio so the player matches the video shape.
          All overlay chrome (actions, text, progress, locked overlay) lives
          inside the stage so it hugs the video frame, not the viewport edge.
      */}
      <div
        className="relative h-full w-full md:w-auto md:max-w-full mx-auto md:[aspect-ratio:var(--stage-aspect)]"
        style={{ ['--stage-aspect' as string]: stageAspect } as React.CSSProperties}
      >
      {/* Main media fills the stage. */}
      {shouldMountVideo && item.video?.url ? (
        <video
          ref={videoRef}
          src={item.video.url}
          poster={item.coverUrl ?? undefined}
          loop
          playsInline
          muted={muted}
          preload={preload}
          className={`absolute inset-0 w-full h-full z-0 ${isLandscape ? 'md:object-cover object-contain' : 'object-cover'}`}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (v.duration > 0) setProgress(v.currentTime / v.duration);
          }}
          onError={() => {
            // Signed URL may have expired. Let the feed know so it can refetch.
            onVideoError?.();
          }}
        />
      ) : item.coverUrl ? (
        <img
          src={item.coverUrl}
          alt={item.title}
          className={`absolute inset-0 w-full h-full z-0 select-none ${isLandscape ? 'md:object-cover object-contain' : 'object-cover'}`}
          draggable={false}
        />
      ) : (
        <div className="relative z-0 text-muted text-sm">No preview available</div>
      )}

      {/* Tap surface for play/pause + double-tap like.
          Sits above the media but below the UI chrome. */}
      <div
        className="absolute inset-0 z-[5]"
        onClick={handleSurfaceTap}
      />

      {/* Paused indicator (only when active + user-paused) */}
      {active && userPaused && shouldMountVideo && item.video?.url && !locked && (
        <div className="absolute inset-0 z-[6] flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
            <FontAwesomeIcon icon={faPlay} className="w-8 h-8 text-white/90 ml-1" />
          </div>
        </div>
      )}

      {/* Double-tap heart burst */}
      {likeBurst > 0 && (
        <div
          key={likeBurst}
          className="absolute inset-0 z-[7] flex items-center justify-center pointer-events-none"
        >
          <FontAwesomeIcon
            icon={faHeart}
            className="w-32 h-32 text-red-500 drop-shadow-2xl reel-heart-burst"
          />
        </div>
      )}

      {/* Right-side actions. Mute lives at the top of this column now so it
          doesn't collide with the top-right Hide UI pill and the For You /
          Browse All tab bar. */}
      <div className={`absolute right-3 bottom-16 z-10 flex flex-col items-center gap-3 ${chromeClass}`}>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
          aria-label={muted ? 'Unmute' : 'Mute'}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center cursor-pointer"
        >
          <FontAwesomeIcon icon={muted ? faVolumeXmark : faVolumeHigh} className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/creator/${item.creator.id}`); }}
          aria-label="Creator"
          className="w-12 h-12 rounded-full bg-surface-hover border-2 border-white/80 overflow-hidden cursor-pointer"
        >
          {item.creator.avatarUrl ? (
            <img src={item.creator.avatarUrl} alt={item.creator.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/70">
              <FontAwesomeIcon icon={faUser} className="w-5 h-5" />
            </div>
          )}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleLike(); }}
          aria-label="Like"
          className="flex flex-col items-center gap-1 cursor-pointer"
        >
          <FontAwesomeIcon
            icon={faHeart}
            className={`w-7 h-7 drop-shadow transition-colors ${item.liked ? 'text-red-500' : 'text-white'}`}
          />
          <span className="text-white text-xs font-medium drop-shadow">{item.likeCount}</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleFavorite(); }}
          aria-label="Save"
          className="flex flex-col items-center gap-1 cursor-pointer"
        >
          <FontAwesomeIcon
            icon={faBookmark}
            className={`w-6 h-6 drop-shadow transition-colors ${item.favorited ? 'text-accent' : 'text-white'}`}
          />
          <span className="text-white text-xs font-medium drop-shadow">Save</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onOpenComments(item.id); }}
          aria-label="Comments"
          className="flex flex-col items-center gap-1 cursor-pointer"
        >
          <FontAwesomeIcon icon={faComment} className="w-6 h-6 text-white drop-shadow" />
          <span className="text-white text-xs font-medium drop-shadow">{item.commentCount}</span>
        </button>
      </div>

      {/* Bottom gradient scrim — darkens just the bottom strip so white text
          stays legible without covering most of the frame. */}
      <div
        className={`absolute left-0 right-0 bottom-0 h-28 z-[8] pointer-events-none bg-gradient-to-t from-black/70 via-black/20 to-transparent ${chromeClass}`}
      />

      {/* Bottom info — compact so it covers as little of the video as
          possible. Creator + title only on mobile; description appears on
          desktop where space is plentiful. Series link stays (it's the
          pathway back to a show). */}
      <div
        className={`absolute left-3 right-20 bottom-7 z-10 text-white drop-shadow pointer-events-none ${chromeClass}`}
      >
        <div className="text-sm font-semibold truncate">@{item.creator.name}</div>
        <div className="text-sm font-medium line-clamp-1 mt-0.5">
          {item.series && item.episodeNumber != null && (
            <span className="text-white/60 mr-1">Ep {item.episodeNumber} ·</span>
          )}
          {item.title}
        </div>
        {item.description && (
          <div className="hidden md:block text-xs text-white/80 line-clamp-2 mt-1">{item.description}</div>
        )}
        {item.series && (
          <div className="flex items-center gap-2 mt-0.5 pointer-events-auto flex-wrap">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/reels/browse/${item.series!.id}`);
              }}
              className="text-[11px] text-white/75 hover:text-white inline-flex items-center gap-1 cursor-pointer"
            >
              From: <span className="underline">{item.series.title}</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/reels?seriesId=${item.series!.id}&start=${item.id}`);
              }}
              className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-white/90 font-medium cursor-pointer transition-colors"
            >
              All Episodes
            </button>
          </div>
        )}
      </div>

      {/* Progress bar sits right at the very bottom of the card (above the
          home indicator safe area). Thin, unobtrusive, full-width. */}
      {active && shouldMountVideo && item.video?.url && !locked && (
        <div
          className={`absolute left-0 right-0 bottom-1 z-10 h-0.5 bg-white/15 ${chromeClass}`}
        >
          <div
            className="h-full bg-white/90"
            style={{ width: `${Math.round(progress * 100)}%`, transition: 'width 100ms linear' }}
          />
        </div>
      )}

      {/* Locked overlay */}
      {locked && (
        <div className="absolute inset-0 z-20 bg-black/55 backdrop-blur-sm flex flex-col items-center justify-center gap-4 px-6 text-white">
          <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
            <FontAwesomeIcon icon={faLock} className="w-6 h-6" />
          </div>
          <div className="text-center">
            {item.series && (
              <div className="text-xs text-white/50 mb-1 tracking-wide uppercase">
                {item.series.title}{item.episodeNumber != null ? ` · Ep ${item.episodeNumber}` : ''}
              </div>
            )}
            <div className="text-lg font-semibold">{item.title}</div>
            <div className="text-sm text-white/60 mt-1">Unlock to watch this episode</div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleUnlock(); }}
            disabled={unlocking}
            className="h-12 px-8 rounded-full bg-accent text-white font-semibold text-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {unlocking ? 'Unlocking…' : `Unlock · ${item.tokenPrice} tokens`}
          </button>
          {error && <p className="text-red-300 text-sm text-center">{error}</p>}
        </div>
      )}
      </div>
      {/* /stage */}

      {/* Heart burst keyframes */}
      <style jsx>{`
        :global(.reel-heart-burst) {
          animation: reel-heart-burst 800ms ease-out forwards;
          transform-origin: center;
        }
        @keyframes reel-heart-burst {
          0% { opacity: 0; transform: scale(0.3); }
          20% { opacity: 1; transform: scale(1.15); }
          60% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
