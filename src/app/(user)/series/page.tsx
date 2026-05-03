'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { userApi } from '@/utils/api';
import { useRouter } from 'next/navigation';

const PAGE_SIZE = 20;

export default function SeriesBrowse() {
  const router = useRouter();
  const [series, setSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchSeries = useCallback(async (pageNum: number, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await userApi.browseSeries({ page: pageNum, limit: PAGE_SIZE });
      const data = res.data as { items: any[]; total: number };
      const newItems = data.items || [];
      if (append) {
        setSeries(prev => [...prev, ...newItems]);
      } else {
        setSeries(newItems);
      }
      setHasMore(pageNum * PAGE_SIZE < data.total);
    } catch {
      if (!append) setSeries([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    pageRef.current = 1;
    setHasMore(true);
    fetchSeries(1, false);
  }, [fetchSeries]);

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          pageRef.current += 1;
          fetchSeries(pageRef.current, true);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, fetchSeries]);

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight mb-6 md:mb-8">Series</h1>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-2 border-border border-t-accent rounded-full animate-spin" /></div>
      ) : series.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted">No series available yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {series.map((s: any) => {
              // When the series has multiple cards to stack, drop the outer
              // chrome — the stack itself is the visual. Single-image and
              // no-image series keep the rounded surface card so they don't
              // look orphaned.
              const hasStack = (s.coverStack?.length ?? 0) >= 2;
              return (
                <div
                  key={s.id}
                  onClick={() => router.push(`/series/${s.id}`)}
                  className={`cursor-pointer transition-all group ${
                    hasStack
                      ? ''
                      : 'bg-surface border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-border/80'
                  }`}
                >
                  <SeriesCover
                    stack={s.coverStack}
                    title={s.title}
                    bare={hasStack}
                    imageCount={s.imageCount}
                    videoCount={s.videoCount}
                    totalItems={s.totalItems}
                  />
                  <div className={hasStack ? 'pt-3 px-1' : 'p-3'}>
                    <h3 className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">{s.title}</h3>
                    <p className="text-xs text-muted mt-1">{s.creator?.name} · {s.contentCount || 0} contents</p>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-1" />
          {loadingMore && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
          )}
          {!hasMore && series.length > 0 && (
            <p className="text-center text-muted text-xs py-8">No more series</p>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Folder-style stacked-card cover. Renders the contents as a vertical
 * stack of cards where each card behind the top one peeks out above as a
 * visible sliver — like a manila folder full of papers, or a stack of
 * recipe cards where you can clearly see the top edge of every card in
 * the deck. Falls back to a single image — or the book placeholder —
 * when the deck has < 2 cards.
 *
 * Layout: container reserves room at the top for the slivers; the front
 * card sits flush with the bottom of the container, each card behind
 * shifts UP by a fixed sliver height so its top edge is visible.
 */
/**
 * Small black-pill badge in the same visual language as the homepage
 * TypeBadge. Says "X PHOTOS" / "X VIDEOS" / "MIXED · N" depending on
 * what the series contains.
 */
function ItemCountBadge({
  imageCount = 0, videoCount = 0, totalItems = 0,
}: { imageCount?: number; videoCount?: number; totalItems?: number }) {
  const total = totalItems || imageCount + videoCount;
  if (!total) return null;

  let label: string;
  let icon: React.ReactNode;
  if (imageCount > 0 && videoCount > 0) {
    label = `MIXED · ${total}`;
    icon = null;
  } else if (videoCount > 0) {
    label = videoCount > 1 ? `${videoCount} VIDEOS` : 'VIDEO';
    icon = (
      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z" />
      </svg>
    );
  } else {
    label = imageCount > 1 ? `${imageCount} PHOTOS` : 'PHOTO';
    icon = (
      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
      </svg>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-bold bg-black/60 text-white backdrop-blur-sm pointer-events-none">
      {icon}
      {label}
    </span>
  );
}

function SeriesCover({
  stack, title, bare = false,
  imageCount = 0, videoCount = 0, totalItems = 0,
}: {
  stack?: string[];
  title?: string;
  bare?: boolean;
  imageCount?: number;
  videoCount?: number;
  totalItems?: number;
}) {
  const urls = (stack || []).slice(0, 5);
  const hasStack = urls.length >= 2;
  const single = urls[0];

  if (!single) {
    return (
      <div className="h-40 bg-surface-hover flex items-center justify-center">
        <svg className="w-12 h-12 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>
      </div>
    );
  }

  if (!hasStack) {
    return (
      <div className="relative h-40 bg-surface-hover overflow-hidden">
        <img src={single} alt={title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        <div className="absolute top-2 left-2">
          <ItemCountBadge imageCount={imageCount} videoCount={videoCount} totalItems={totalItems} />
        </div>
      </div>
    );
  }

  // depth 0 = front (top) card, anchored bottom-left of the container.
  // depth N = back card, anchored toward upper-right with its top + right
  // edges peeking out as slivers. Render deepest first so DOM order =
  // paint order (back paints first, front paints over).
  const ordered = [...urls].map((url, depth) => ({ url, depth })).reverse();

  const SLIVER_Y = 8;          // px each back card peeks UP
  const SLIVER_X = 12;         // px each back card peeks RIGHT
  const FRONT_HEIGHT = 140;    // visible card height
  const maxDepth = urls.length - 1;
  const containerHeight = FRONT_HEIGHT + maxDepth * SLIVER_Y;

  return (
    <div
      className={`relative w-full ${bare ? '' : 'bg-surface-hover overflow-hidden'}`}
      style={{ height: containerHeight }}
    >
      {ordered.map(({ url, depth }) => {
        // Anchor each card with both left+right so the absolute width
        // (container width minus the total fan-out) is identical across
        // cards; only the position changes.
        const left = depth * SLIVER_X;
        const right = (maxDepth - depth) * SLIVER_X;
        const bottom = depth * SLIVER_Y;
        const opacity = depth === 0 ? 1 : Math.max(0.7, 1 - depth * 0.08);

        return (
          <div
            key={`${url}-${depth}`}
            className="absolute overflow-hidden border border-border/70 rounded-lg shadow-md transition-all duration-300 ease-out"
            style={{
              left,
              right,
              bottom,
              height: FRONT_HEIGHT,
              opacity,
              zIndex: 10 - depth,
            }}
          >
            <img
              src={url}
              alt={depth === 0 ? title : ''}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
            {/* Dim non-top cards so the front one is clearly the focus */}
            {depth > 0 && (
              <div className="pointer-events-none absolute inset-0 bg-black/20" />
            )}
            {/* Item-count badge sits on the front (top) card only */}
            {depth === 0 && (
              <div className="absolute top-2 left-2">
                <ItemCountBadge imageCount={imageCount} videoCount={videoCount} totalItems={totalItems} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
