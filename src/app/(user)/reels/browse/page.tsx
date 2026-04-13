'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { userApi } from '@/utils/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVideo, faMagnifyingGlass, faXmark } from '@fortawesome/free-solid-svg-icons';
import ReelsTabs from '@/components/reels/ReelsTabs';

interface ReelsSeries {
  id: string;
  title: string;
  description?: string | null;
  coverUrl: string | null;
  contentCount: number;
  creator?: { id: string; name: string };
}

const PAGE_SIZE = 24;

export default function ReelsBrowsePage() {
  const router = useRouter();
  const [series, setSeries] = useState<ReelsSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [query, setQuery] = useState('');
  const pageRef = useRef(1);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);

  const fetchSeries = useCallback(async (pageNum: number, append: boolean, q?: string) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await userApi.browseSeries({ page: pageNum, limit: PAGE_SIZE, type: 'reels', q: q || undefined });
      const data = res.data as { items: ReelsSeries[]; total: number };
      const newItems = data.items || [];
      setSeries(prev => append ? [...prev, ...newItems] : newItems);
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

  // Debounced search: reset to page 1 and refetch when query changes.
  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      pageRef.current = 1;
      setHasMore(true);
      fetchSeries(1, false, val);
    }, 350);
  };

  useEffect(() => {
    return () => { if (debounceRef.current !== null) window.clearTimeout(debounceRef.current); };
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          pageRef.current += 1;
          fetchSeries(pageRef.current, true, query);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, fetchSeries, query]);

  return (
    <div>
      {/* Top-center pill tabs, same control as the overlay on the feed. */}
      <ReelsTabs variant="solid" />

      {/* Search bar */}
      <div className="relative max-w-sm mx-auto mb-6">
        <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search series..."
          className="w-full h-10 pl-9 pr-9 rounded-full border border-border bg-surface text-foreground text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
        />
        {query && (
          <button
            onClick={() => handleQueryChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
            aria-label="Clear search"
          >
            <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-2 border-border border-t-accent rounded-full animate-spin" />
        </div>
      ) : series.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted">{query ? `No results for "${query}"` : 'No reels yet.'}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {series.map((s) => (
              <div
                key={s.id}
                onClick={() => router.push(`/reels/browse/${s.id}`)}
                className="cursor-pointer group"
              >
                {/* 9:16 portrait-ish cover so reels thumbs feel "tall" like the feed */}
                <div className="aspect-[9/16] bg-surface-hover rounded-lg overflow-hidden border border-border group-hover:border-accent/50 transition-colors relative">
                  {s.coverUrl ? (
                    <img
                      src={s.coverUrl}
                      alt={s.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FontAwesomeIcon icon={faVideo} className="w-10 h-10 text-muted" />
                    </div>
                  )}
                  {/* Gradient + episode count pill */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent h-20 pointer-events-none" />
                  <div className="absolute bottom-2 left-2 right-2 text-white">
                    <p className="text-xs font-semibold truncate drop-shadow">{s.title}</p>
                    <p className="text-[10px] text-white/80 truncate drop-shadow">
                      {s.creator?.name} · {s.contentCount || 0} ep
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div ref={sentinelRef} className="h-1" />
          {loadingMore && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
          )}
          {!hasMore && series.length > 0 && (
            <p className="text-center text-muted text-xs py-8">No more reels</p>
          )}
        </>
      )}
    </div>
  );
}
