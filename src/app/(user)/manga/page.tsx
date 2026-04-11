'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { userApi } from '@/utils/api';
import { useRouter } from 'next/navigation';

const PAGE_SIZE = 24;

interface MangaSeries {
  id: string;
  title: string;
  description?: string | null;
  coverUrl: string | null;
  contentCount: number;
  creator?: { id: string; name: string };
}

export default function MangaBrowse() {
  const router = useRouter();
  const [series, setSeries] = useState<MangaSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchSeries = useCallback(async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await userApi.browseSeries({ page: pageNum, limit: PAGE_SIZE, type: 'manga' });
      const data = res.data as { items: MangaSeries[]; total: number };
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

  useEffect(() => {
    pageRef.current = 1;
    setHasMore(true);
    fetchSeries(1, false);
  }, [fetchSeries]);

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
      <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight mb-2">Manga</h1>
      <p className="text-sm text-muted mb-6 md:mb-8">Read page-by-page in the immersive reader.</p>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-2 border-border border-t-accent rounded-full animate-spin" />
        </div>
      ) : series.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted">No manga yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
            {series.map((s) => (
              <div
                key={s.id}
                onClick={() => router.push(`/manga/${s.id}`)}
                className="cursor-pointer group"
              >
                {/* 2:3 portrait cover, standard manga aspect */}
                <div className="aspect-[2/3] bg-surface-hover rounded-lg overflow-hidden border border-border group-hover:border-accent/50 transition-colors">
                  {s.coverUrl ? (
                    <img
                      src={s.coverUrl}
                      alt={s.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-accent transition-colors">{s.title}</h3>
                  <p className="text-xs text-muted mt-0.5">{s.creator?.name} · {s.contentCount || 0} ch</p>
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
            <p className="text-center text-muted text-xs py-8">No more manga</p>
          )}
        </>
      )}
    </div>
  );
}
