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
            {series.map((s: any) => (
              <div
                key={s.id}
                onClick={() => router.push(`/series/${s.id}`)}
                className="bg-surface border border-border rounded-xl overflow-hidden cursor-pointer hover:shadow-lg hover:border-border/80 transition-all group"
              >
                <div className="h-40 bg-surface-hover flex items-center justify-center">
                  {s.coverUrl ? (
                    <img src={s.coverUrl} alt={s.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-12 h-12 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">{s.title}</h3>
                  <p className="text-xs text-muted mt-1">{s.creator?.name} · {s.contentCount || 0} contents</p>
                </div>
              </div>
            ))}
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
