'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { userApi } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import MediaPlayer from '@/components/MediaPlayer';

interface ContentDetail {
  id: string;
  title: string;
  description: string;
  type: string;
  coverUrl?: string | null;
  isFree: boolean;
  tokenPrice: number;
  isUnlocked: boolean;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isFavorited: boolean;
  creator: { id: string; name: string; avatarUrl?: string };
  createdAt: string;
  series?: { id: string; title: string; type?: 'normal' | 'reels' };
  orderInSeries?: number;
  workflowJson?: string;
}

interface ContentItemData {
  id: string;
  url: string | null;
  type: string;
  sortOrder: number;
  locked: boolean;
  isFreePreview: boolean;
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
  orientation?: 'portrait' | 'landscape' | 'square' | null;
}

function useGalleryColumns() {
  const [cols, setCols] = useState(2);
  useEffect(() => {
    const update = () => { const w = window.innerWidth; setCols(w >= 768 ? 4 : w >= 640 ? 3 : 2); };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return cols;
}

function GalleryMasonry({ items, onOpenLightbox }: { items: ContentItemData[]; onOpenLightbox: (id: string) => void }) {
  const cols = useGalleryColumns();
  const columns: ContentItemData[][] = Array.from({ length: cols }, () => []);
  const heights = new Array(cols).fill(0);

  items.forEach((item) => {
    const shortest = heights.indexOf(Math.min(...heights));
    columns[shortest].push(item);
    const aspect = item.width && item.height ? item.height / item.width : item.orientation === 'landscape' ? 9 / 16 : item.orientation === 'square' ? 1 : 4 / 3;
    heights[shortest] += aspect;
  });

  const getAspect = (item: ContentItemData): React.CSSProperties =>
    item.width && item.height ? { aspectRatio: `${item.width} / ${item.height}` }
    : item.orientation === 'landscape' ? { aspectRatio: '16 / 9' }
    : item.orientation === 'square' ? { aspectRatio: '1 / 1' }
    : { aspectRatio: '3 / 4' };

  return (
    <div className="flex gap-2 md:gap-3 w-full">
      {columns.map((col, ci) => (
        <div key={ci} className="flex-1 min-w-0 flex flex-col gap-2 md:gap-3">
          {col.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl overflow-hidden bg-surface-hover relative ${
                !item.locked && item.url ? 'cursor-pointer hover:ring-2 hover:ring-accent/50 transition-all' : ''
              }`}
              style={getAspect(item)}
              onClick={() => !item.locked && item.url && onOpenLightbox(item.id)}
            >
              {item.locked ? (
                <>
                  {item.url ? (
                    <img src={item.url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-surface-hover" />
                  )}
                  <div className="absolute inset-0 bg-black/15 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white drop-shadow" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                  </div>
                </>
              ) : item.type === 'image' ? (
                <>
                  <img src={item.url!} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                    <svg className="w-6 h-6 text-white drop-shadow" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6" />
                    </svg>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-black relative">
                  <img src={item.url!} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <svg className="w-10 h-10 text-white/80 drop-shadow" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Thresholds for swipe detection on touch devices.
// SWIPE_COMMIT: drag beyond this fraction of viewport → commit the navigation
// on release. Below that → snap back.
// SWIPE_VELOCITY_PX_PER_MS: or if the user flicks fast enough, commit even
// with a small drag distance.
const SWIPE_COMMIT = 0.22;
const SWIPE_VELOCITY = 0.5;

function Lightbox({ items, index, onClose, onPrev, onNext }: {
  items: ContentItemData[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const item = items[index];

  // Drag state for touch swipe.
  // Horizontal drag cycles images; vertical drag closes the lightbox (iOS Photos style).
  // Only touch-typed pointers drive this — mouse / trackpad on desktop keeps clicking arrows.
  const [drag, setDrag] = useState<{ x: number; y: number; axis: 'x' | 'y' | null } | null>(null);
  const dragStart = useRef<{ x: number; y: number; t: number; pointerType: string } | null>(null);
  const [exiting, setExiting] = useState<'left' | 'right' | 'down' | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onPrev, onNext]);

  // Reset drag whenever the active item changes (e.g. after committing a swipe).
  useEffect(() => {
    setDrag(null);
    setExiting(null);
  }, [index]);

  if (!item) return null;

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    // Only respond to touch. Mouse users have arrow buttons + keyboard.
    if (e.pointerType !== 'touch') return;
    dragStart.current = { x: e.clientX, y: e.clientY, t: Date.now(), pointerType: e.pointerType };
    setDrag({ x: 0, y: 0, axis: null });
  };

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!dragStart.current || dragStart.current.pointerType !== 'touch') return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    // Lock to an axis once movement exceeds a small deadzone, so the direction
    // doesn't wobble mid-swipe.
    let axis = drag?.axis ?? null;
    if (!axis && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }

    // On horizontal axis: if there's no neighbor in that direction, apply
    // rubber-band resistance so it's obvious the user hit a boundary.
    let constrainedX = dx;
    if (axis === 'x') {
      if ((dx > 0 && index === 0) || (dx < 0 && index === items.length - 1)) {
        constrainedX = dx / 3;
      }
    }
    // On vertical: only allow drag-down-to-close, not up.
    const constrainedY = axis === 'y' ? Math.max(0, dy) : 0;

    setDrag({ x: axis === 'x' ? constrainedX : 0, y: constrainedY, axis });
  };

  const onPointerEnd: React.PointerEventHandler<HTMLDivElement> = () => {
    if (!dragStart.current || dragStart.current.pointerType !== 'touch') return;
    const start = dragStart.current;
    dragStart.current = null;

    const current = drag ?? { x: 0, y: 0, axis: null };
    const elapsed = Math.max(1, Date.now() - start.t);

    if (current.axis === 'x') {
      const vw = window.innerWidth;
      const velocity = Math.abs(current.x) / elapsed;
      const shouldCommit = Math.abs(current.x) / vw > SWIPE_COMMIT || velocity > SWIPE_VELOCITY;

      if (shouldCommit && current.x < 0 && index < items.length - 1) {
        // Swipe-left → next
        setExiting('left');
        window.setTimeout(onNext, 180);
        return;
      }
      if (shouldCommit && current.x > 0 && index > 0) {
        // Swipe-right → prev
        setExiting('right');
        window.setTimeout(onPrev, 180);
        return;
      }
    } else if (current.axis === 'y') {
      const vh = window.innerHeight;
      const velocity = current.y / elapsed;
      if (current.y / vh > SWIPE_COMMIT || velocity > SWIPE_VELOCITY) {
        setExiting('down');
        window.setTimeout(onClose, 180);
        return;
      }
    }

    // Not enough → snap back.
    setDrag(null);
  };

  // Content transform combines in-progress drag and the exit animation.
  let transform = 'translate(0, 0)';
  let transition = 'none';
  let opacity = 1;
  if (exiting === 'left') {
    transform = `translate(-100vw, 0)`;
    transition = 'transform 180ms ease-out';
  } else if (exiting === 'right') {
    transform = `translate(100vw, 0)`;
    transition = 'transform 180ms ease-out';
  } else if (exiting === 'down') {
    transform = `translate(0, 100vh)`;
    transition = 'transform 180ms ease-out, opacity 180ms ease-out';
    opacity = 0;
  } else if (drag) {
    transform = `translate(${drag.x}px, ${drag.y}px)`;
    transition = drag.axis ? 'none' : 'transform 180ms ease-out';
    // Fade backdrop as the user drags down to close.
    if (drag.axis === 'y' && drag.y > 0) {
      opacity = Math.max(0.4, 1 - drag.y / (window.innerHeight * 0.8));
    }
  }

  // Fade the whole backdrop when dragging down, so dismissing feels natural.
  const backdropOpacity = drag?.axis === 'y' && drag.y > 0
    ? Math.max(0.4, 1 - drag.y / (window.innerHeight * 0.8))
    : exiting === 'down' ? 0 : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{ touchAction: 'none' }}
    >
      {/* Backdrop — fades independently so content can track the finger. */}
      <div
        className="absolute inset-0 bg-black/90"
        style={{ opacity: backdropOpacity, transition: exiting ? 'opacity 180ms ease-out' : 'none' }}
      />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white z-10 cursor-pointer"
        style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Counter */}
      <div
        className="absolute top-4 left-4 text-white/70 text-sm z-10"
        style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
      >
        {index + 1} / {items.length}
      </div>

      {/* Prev / Next — hidden on touch devices (hover: none) where swipe takes over. */}
      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white cursor-pointer z-10"
          aria-label="Previous"
        >
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
      )}
      {index < items.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white cursor-pointer z-10"
          aria-label="Next"
        >
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      )}

      {/* Content — draggable by touch. */}
      <div
        className="relative max-w-[95vw] max-h-[90vh] flex items-center justify-center px-4 select-none"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        style={{ transform, transition, opacity, willChange: 'transform' }}
      >
        {item.type === 'image' ? (
          <img
            src={item.url!}
            alt=""
            decoding="async"
            fetchPriority="high"
            draggable={false}
            className="max-w-full max-h-[90vh] object-contain pointer-events-none"
          />
        ) : (
          <MediaPlayer
            url={item.url!}
            width={item.width}
            height={item.height}
            orientation={item.orientation}
            autoPlay
            className="max-h-[90vh]"
          />
        )}
      </div>

      {/* Hint overlay the first time the lightbox opens on a touch device.
          Only rendered on narrow viewports so desktop doesn't see it. */}
      <div className="md:hidden pointer-events-none absolute bottom-6 left-0 right-0 text-center text-white/50 text-[11px]"
           style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        Swipe to navigate · Swipe down to close
      </div>
    </div>
  );
}

export default function ContentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isAuthenticated, refreshUser } = useAuth();

  const requireAuth = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return true;
    }
    return false;
  };
  const [content, setContent] = useState<ContentDetail | null>(null);
  const [items, setItems] = useState<ContentItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComment, setLoadingComment] = useState(false);

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const viewableItems = items.filter(i => !i.locked && i.url);

  const openLightbox = (itemId: string) => {
    const idx = viewableItems.findIndex(i => i.id === itemId);
    if (idx >= 0) setLightboxIndex(idx);
  };

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prevLightbox = useCallback(() => setLightboxIndex(prev => prev !== null && prev > 0 ? prev - 1 : prev), []);
  const nextLightbox = useCallback(() => setLightboxIndex(prev => prev !== null && prev < viewableItems.length - 1 ? prev + 1 : prev), [viewableItems.length]);

  const fetchItems = async (contentId: string) => {
    try {
      const itemsRes = await userApi.getContentItems(contentId);
      const itemsData = itemsRes.data as { items: ContentItemData[]; locked: boolean };
      setItems(itemsData.items || []);
      setIsLocked(itemsData.locked);
    } catch {
      // ignore
    }
  };

  const fetchComments = async () => {
    try {
      const res = await userApi.getComments(id as string);
      setComments(res.data?.items || []);
    } catch {}
  };

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await userApi.getContentDetail(id as string);
        const detail = res.data as ContentDetail;
        setContent(detail);
        setLiked(detail.isLiked || false);
        setFavorited(detail.isFavorited || false);
        setLikeCount(detail.likeCount || 0);
        setCommentCount(detail.commentCount || 0);
        await fetchItems(id as string);
        fetchComments();
      } catch {
        setContent(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleUnlock = async () => {
    if (!id || requireAuth()) return;
    setUnlocking(true);
    setMessage(null);
    try {
      const res = await userApi.unlockContent(id as string);
      if (res.message === 'Already unlocked' || res.data) {
        setMessage({ type: 'success', text: 'Content unlocked!' });
        const [detailRes] = await Promise.all([
          userApi.getContentDetail(id as string),
          fetchItems(id as string),
        ]);
        const detail = detailRes.data as ContentDetail;
        setContent(detail);
        setLiked(detail.isLiked || false);
        setFavorited(detail.isFavorited || false);
        setLikeCount(detail.likeCount || 0);
        refreshUser();
      }
    } catch (err: unknown) {
      const error = err as Error;
      setMessage({ type: 'error', text: error.message || 'Failed to unlock' });
    } finally {
      setUnlocking(false);
    }
  };

  const handleLike = async () => {
    if (requireAuth()) return;
    try {
      const res = await userApi.toggleLike(id as string);
      setLiked(res.data.liked);
      setLikeCount(res.data.likeCount);
    } catch {}
  };

  const handleFavorite = async () => {
    if (requireAuth()) return;
    try {
      const res = await userApi.toggleFavorite(id as string);
      setFavorited(res.data.favorited);
    } catch {}
  };

  const handleComment = async () => {
    if (!commentText.trim() || requireAuth()) return;
    setLoadingComment(true);
    try {
      const res = await userApi.addComment(id as string, commentText.trim());
      setComments(prev => [res.data, ...prev]);
      setCommentText('');
      setCommentCount(prev => prev + 1);
    } catch {} finally {
      setLoadingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted text-sm mb-4">Content not found</p>
        <button
          onClick={() => router.back()}
          className="text-sm text-accent hover:underline cursor-pointer"
        >
          Go back
        </button>
      </div>
    );
  }

  const imgCount = items.filter(i => i.type === 'image').length;
  const vidCount = items.filter(i => i.type === 'video').length;

  return (
    <div>
      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          items={viewableItems}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prevLightbox}
          onNext={nextLightbox}
        />
      )}

      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="text-sm text-muted hover:text-foreground transition-colors mb-6 cursor-pointer flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back
      </button>

      {/* Content info card */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden mb-8">
        <div className="flex flex-col md:flex-row">
          {/* Hero image: prefer the content's own cover; fall back to the first viewable item. */}
          {(() => {
            const heroUrl = content.coverUrl || items[0]?.url;
            if (!heroUrl) return null;
            const heroLocked = !content.coverUrl && items[0]?.locked;
            return (
              <div className="w-full md:w-80 h-56 md:h-64 bg-surface-hover relative overflow-hidden flex-shrink-0">
                <img src={heroUrl} alt={content.title} decoding="async" fetchPriority="high" className="w-full h-full object-cover" />
                {heroLocked && (
                  <div className="absolute inset-0 bg-black/15 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white drop-shadow" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Details */}
          <div className="flex-1 p-4 md:p-6">
            {content.series && (
              <a href={`/series/${content.series.id}`} className="text-xs text-accent hover:underline">
                Part of: {content.series.title}{content.orderInSeries ? ` · #${content.orderInSeries}` : ''}
              </a>
            )}
            <h1 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight mb-2">
              {content.title}
            </h1>
            <p className="text-muted text-sm mb-5">{content.description}</p>

            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm mb-5">
              <div>
                <span className="text-muted">Creator</span>
                <p className="text-foreground font-medium hover:text-accent transition-colors cursor-pointer" onClick={() => router.push(`/creator/${content.creator.id}`)}>{content.creator.name}</p>
              </div>
              <div>
                <span className="text-muted">Type</span>
                <p className="text-foreground font-medium capitalize">{content.type}</p>
              </div>
              <div>
                <span className="text-muted">Created</span>
                <p className="text-foreground font-medium">{new Date(content.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-muted">Price</span>
                <p className="font-medium">
                  {content.isFree ? (
                    <span className="text-emerald-400">Free</span>
                  ) : (
                    <span className="text-foreground">{content.tokenPrice} tokens</span>
                  )}
                </p>
              </div>
              <div>
                <span className="text-muted">Items</span>
                <p className="text-foreground font-medium">{imgCount} img{vidCount > 0 ? ` / ${vidCount} vid` : ''}</p>
              </div>
            </div>

            {/* Message */}
            {message && (
              <div className={`mb-4 rounded-lg px-4 py-2 border text-sm ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {message.text}
              </div>
            )}

            {isLocked && !content.isFree && (
              <button
                onClick={handleUnlock}
                disabled={unlocking}
                className="h-11 px-6 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {unlocking ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Unlocking...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    Unlock for {content.tokenPrice} tokens
                  </>
                )}
              </button>
            )}

            {/* Download Workflow button */}
            {content.workflowJson && (content.isUnlocked || content.isFree) && (
              <button
                onClick={() => {
                  const blob = new Blob([content.workflowJson!], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}-workflow.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="mt-4 h-9 px-4 rounded-lg border border-border bg-surface-hover hover:bg-border text-foreground text-sm font-medium transition-colors cursor-pointer flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download ComfyUI Workflow
              </button>
            )}

            {/* Like and Favorite buttons */}
            <div className="flex items-center gap-4 mt-4">
              <button onClick={handleLike} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <svg className={`w-5 h-5 ${liked ? 'text-red-500 fill-red-500' : 'text-muted'}`} fill={liked ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                </svg>
                <span className={liked ? 'text-red-500' : 'text-muted'}>{likeCount}</span>
              </button>
              <button onClick={handleFavorite} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <svg className={`w-5 h-5 ${favorited ? 'text-accent fill-accent' : 'text-muted'}`} fill={favorited ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                </svg>
                <span className={favorited ? 'text-accent' : 'text-muted'}>Save</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Items gallery */}
      <h2 className="text-lg font-semibold text-foreground mb-4">
        {isLocked ? 'Preview' : 'Content'}
      </h2>
      <GalleryMasonry items={items} onOpenLightbox={openLightbox} />

      {/* Comments */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-foreground mb-4">Comments ({commentCount})</h3>
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleComment()}
            placeholder="Write a comment..."
            className="flex-1 h-10 px-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
          <button
            onClick={handleComment}
            disabled={loadingComment || !commentText.trim()}
            className="px-4 h-10 bg-foreground text-background rounded-lg text-sm font-medium hover:bg-foreground/90 disabled:opacity-50 cursor-pointer"
          >
            Post
          </button>
        </div>
        <div className="space-y-4">
          {comments.map((c: any) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-xs font-medium text-muted shrink-0">
                {c.user?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{c.user?.name || 'User'}</span>
                  <span className="text-xs text-muted">{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-secondary mt-0.5">{c.text}</p>
              </div>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-sm text-muted">No comments yet. Be the first!</p>
          )}
        </div>
      </div>
    </div>
  );
}
