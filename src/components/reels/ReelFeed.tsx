'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import ReelCard from './ReelCard';
import CommentsDrawer from './CommentsDrawer';
import { userApi, type ReelItem } from '@/utils/api';

const PAGE_SIZE = 6;
const MUTE_KEY = 'onlybae:reels:muted';
// Signed URLs from S3/CloudFront expire after ~60 minutes. Refetch preemptively.
const MAX_DATA_AGE_MS = 40 * 60 * 1000;

interface ReelFeedProps {
  /** When set, feed is scoped to a single reels series, ordered by ep number asc. */
  seriesId?: string;
  /** When set, auto-scroll to the episode with this content id on initial load. */
  startEpisodeId?: string;
  /** When false, every overlay on each card (buttons, info, progress) fades out. */
  chromeVisible?: boolean;
}

export default function ReelFeed({ seriesId, startEpisodeId, chromeVisible = true }: ReelFeedProps = {}) {
  const [items, setItems] = useState<ReelItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  // Start muted on first visit (iOS autoplay requirement); remember the choice for the session.
  const [muted, setMuted] = useState(true);
  // Which card index the user has manually paused. Reset when active card changes.
  const [userPausedIndex, setUserPausedIndex] = useState<number | null>(null);
  // Content id currently shown in the comments drawer (null = closed).
  const [commentsForId, setCommentsForId] = useState<string | null>(null);
  const dataLoadedAtRef = useRef<number>(Date.now());
  const refetchingRef = useRef(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const wheelLockRef = useRef<number>(0);
  // Tracks whether the initial auto-scroll to `startEpisodeId` has happened yet.
  const startScrollDoneRef = useRef<boolean>(!startEpisodeId);

  // Restore persisted mute preference.
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(MUTE_KEY);
      if (stored === 'false') setMuted(false);
    } catch { /* ignore */ }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev;
      try { sessionStorage.setItem(MUTE_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const togglePauseActive = useCallback(() => {
    setUserPausedIndex(prev => prev === activeIndex ? null : activeIndex);
  }, [activeIndex]);

  // Resume automatically whenever the active card changes.
  useEffect(() => {
    setUserPausedIndex(null);
  }, [activeIndex]);

  const fetchPage = useCallback(async (targetPage: number, replace = false) => {
    const res = await userApi.browseReels({ page: targetPage, limit: PAGE_SIZE, seriesId });
    const newItems = res.data.items || [];
    if (replace) {
      setItems(newItems);
    } else {
      setItems(prev => targetPage === 1 ? newItems : [...prev, ...newItems]);
    }
    setHasMore(newItems.length === PAGE_SIZE);
    dataLoadedAtRef.current = Date.now();
    return newItems;
  }, [seriesId]);

  // Initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await fetchPage(1);
      } catch (err) {
        setError((err as Error).message || 'Failed to load reels');
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchPage]);

  // Auto-prefetch next page when the user gets close to the end.
  useEffect(() => {
    if (loadingMore || !hasMore || loading) return;
    if (items.length === 0) return;
    if (activeIndex < items.length - 2) return;
    (async () => {
      setLoadingMore(true);
      try {
        const next = page + 1;
        await fetchPage(next);
        setPage(next);
      } catch {
        /* keep previous state */
      } finally {
        setLoadingMore(false);
      }
    })();
  }, [activeIndex, items.length, hasMore, loading, loadingMore, page, fetchPage]);

  // Track which card is active via IntersectionObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const idx = Number(entry.target.getAttribute('data-index'));
            if (!Number.isNaN(idx)) setActiveIndex(idx);
          }
        }
      },
      { root: container, threshold: [0.6, 0.9] }
    );

    cardRefs.current.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [items.length]);

  const scrollToIndex = useCallback((idx: number) => {
    const el = cardRefs.current.get(idx);
    if (el && containerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Jump to the requested start episode. If it's not in the already-loaded
  // items and there are more pages, load more until we find it (bounded so
  // we don't spin forever on a stale URL param).
  useEffect(() => {
    if (!startEpisodeId || startScrollDoneRef.current || loading) return;
    const idx = items.findIndex(it => it.id === startEpisodeId);
    if (idx >= 0) {
      // Instant jump (no smooth) so the user doesn't see cards whiz past.
      const el = cardRefs.current.get(idx);
      if (el) {
        el.scrollIntoView({ behavior: 'auto', block: 'start' });
        setActiveIndex(idx);
      }
      startScrollDoneRef.current = true;
      return;
    }
    // Not loaded yet — fetch next page if possible.
    if (hasMore && !loadingMore) {
      (async () => {
        setLoadingMore(true);
        try {
          const next = page + 1;
          await fetchPage(next);
          setPage(next);
        } catch {
          startScrollDoneRef.current = true;
        } finally {
          setLoadingMore(false);
        }
      })();
    } else {
      // Ran out of pages without finding it — stop trying.
      startScrollDoneRef.current = true;
    }
  }, [startEpisodeId, items, loading, hasMore, loadingMore, page, fetchPage]);

  // Refetch everything if a video errors out (likely signed URL expiry).
  // Also refetch when data is older than MAX_DATA_AGE_MS at scroll time.
  const refetchIfStale = useCallback(async (force = false) => {
    if (refetchingRef.current) return;
    const age = Date.now() - dataLoadedAtRef.current;
    if (!force && age < MAX_DATA_AGE_MS) return;
    refetchingRef.current = true;
    try {
      // Refetch page 1 (newest content) and merge by id so scroll position is preserved.
      const res = await userApi.browseReels({ page: 1, limit: Math.max(PAGE_SIZE, items.length), seriesId });
      const refreshed = res.data.items || [];
      if (refreshed.length > 0) {
        const byId = new Map(refreshed.map(r => [r.id, r]));
        setItems(prev => prev.map(it => byId.get(it.id) ?? it));
        dataLoadedAtRef.current = Date.now();
      }
    } catch { /* keep previous state */ }
    finally {
      refetchingRef.current = false;
    }
  }, [items.length, seriesId]);

  // Wheel + keyboard nav
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      const now = Date.now();
      if (now - wheelLockRef.current < 500) {
        e.preventDefault();
        return;
      }
      if (Math.abs(e.deltaY) < 10) return;
      e.preventDefault();
      wheelLockRef.current = now;
      // Staleness check on every navigation action.
      refetchIfStale();
      const next = e.deltaY > 0 ? activeIndex + 1 : activeIndex - 1;
      if (next >= 0 && next < items.length) scrollToIndex(next);
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        refetchIfStale();
        if (activeIndex < items.length - 1) scrollToIndex(activeIndex + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        refetchIfStale();
        if (activeIndex > 0) scrollToIndex(activeIndex - 1);
      } else if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        togglePauseActive();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKey);
    return () => {
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKey);
    };
  }, [activeIndex, items.length, scrollToIndex, toggleMute, togglePauseActive, refetchIfStale]);

  const updateItem = useCallback((updated: ReelItem) => {
    setItems(prev => prev.map(it => it.id === updated.id ? updated : it));
  }, []);

  const handleOpenComments = useCallback((id: string) => {
    setCommentsForId(id);
  }, []);

  const handleCloseComments = useCallback(() => {
    setCommentsForId(null);
  }, []);

  const handleCommentAdded = useCallback(() => {
    if (!commentsForId) return;
    setItems(prev => prev.map(it => it.id === commentsForId ? { ...it, commentCount: it.commentCount + 1 } : it));
  }, [commentsForId]);

  // Pause the active card whenever the comments drawer is open.
  // We reuse userPausedIndex so the existing play/pause plumbing handles it.
  useEffect(() => {
    if (commentsForId !== null) {
      setUserPausedIndex(activeIndex);
    } else {
      // Only clear if we were the one that set it.
      setUserPausedIndex(prev => prev === activeIndex ? null : prev);
    }
  }, [commentsForId, activeIndex]);

  const handleVideoError = useCallback(() => {
    // Likely signed URL expiry. Force refetch.
    refetchIfStale(true);
  }, [refetchIfStale]);

  const setCardRef = (idx: number) => (el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(idx, el);
    else cardRefs.current.delete(idx);
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white/80">
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white/60 text-center px-6">
        <div>
          <p className="text-lg font-semibold">No reels yet</p>
          <p className="text-sm mt-2">Creators haven&apos;t published any short videos yet. Check back soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-y-scroll overflow-x-hidden bg-black reel-scroll"
      style={{
        scrollSnapType: 'y mandatory',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        // iOS PWA momentum scroll will otherwise bounce horizontally on any
        // touch pan, dragging the whole feed off-screen. Limiting touch-action
        // to vertical makes the feed ignore horizontal gestures entirely.
        touchAction: 'pan-y',
        overscrollBehavior: 'contain',
      }}
    >
      <style jsx>{`
        .reel-scroll::-webkit-scrollbar { display: none; }
      `}</style>
      {items.map((item, idx) => (
        <div
          key={item.id}
          ref={setCardRef(idx)}
          data-index={idx}
          className="w-full h-full overflow-hidden"
          style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
        >
          <ReelCard
            item={item}
            active={idx === activeIndex}
            distance={Math.abs(idx - activeIndex)}
            muted={muted}
            userPaused={userPausedIndex === idx}
            chromeVisible={chromeVisible}
            onToggleMute={toggleMute}
            onTogglePause={togglePauseActive}
            onChange={updateItem}
            onVideoError={handleVideoError}
            onOpenComments={handleOpenComments}
          />
        </div>
      ))}
      {loadingMore && (
        <div className="w-full h-16 flex items-center justify-center bg-black">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      <CommentsDrawer
        contentId={commentsForId}
        onClose={handleCloseComments}
        onCommentAdded={handleCommentAdded}
      />
    </div>
  );
}
