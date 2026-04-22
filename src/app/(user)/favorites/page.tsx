'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { userApi } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

interface PreviewItem {
  url: string | null;
  locked: boolean;
  type: string;
  width?: number | null;
  height?: number | null;
  orientation?: 'portrait' | 'landscape' | 'square' | null;
}

interface ContentItem {
  id: string;
  title: string;
  type: string;
  isFree: boolean;
  tokenPrice: number;
  isUnlocked: boolean;
  likeCount: number;
  commentCount: number;
  totalItems: number;
  previews: PreviewItem[];
  creator: { id: string; name: string; avatarUrl?: string };
}

function getAspectStyle(p: PreviewItem): React.CSSProperties {
  if (p.width && p.height) return { aspectRatio: `${p.width} / ${p.height}` };
  if (p.orientation === 'landscape') return { aspectRatio: '16 / 9' };
  if (p.orientation === 'square') return { aspectRatio: '1 / 1' };
  return { aspectRatio: '3 / 4' };
}

function PreviewMedia({ p }: { p: PreviewItem }) {
  if (!p.url) return <div className="w-full h-full bg-surface-hover" />;
  return <img src={p.url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />;
}

function LockOverlay({ iconSize }: { iconSize: string }) {
  return (
    <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
      <svg className={`text-white ${iconSize} drop-shadow`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
    </div>
  );
}

function PreviewGrid({ previews }: { previews: PreviewItem[] }) {
  if (previews.length === 0) return <div style={{ aspectRatio: '3 / 4' }} className="bg-surface-hover flex items-center justify-center text-muted">No preview</div>;
  if (previews.length === 1) {
    const p = previews[0];
    return <div className="bg-surface-hover relative overflow-hidden" style={getAspectStyle(p)}><PreviewMedia p={p} />{p.locked && <LockOverlay iconSize="w-6 h-6" />}</div>;
  }
  if (previews.length === 2) {
    return (
      <div className="flex gap-px overflow-hidden" style={{ aspectRatio: '4 / 3' }}>
        {previews.map((p, i) => <div key={i} className="flex-1 relative overflow-hidden"><PreviewMedia p={p} />{p.locked && <LockOverlay iconSize="w-5 h-5" />}</div>)}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-px overflow-hidden" style={{ aspectRatio: '1 / 1' }}>
      {previews.slice(0, 4).map((p, i) => <div key={i} className="relative overflow-hidden"><PreviewMedia p={p} />{p.locked && <LockOverlay iconSize="w-4 h-4" />}</div>)}
    </div>
  );
}

function ContentCard({ item }: { item: ContentItem }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/content/${item.id}`)}
      className="bg-surface border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer group"
    >
      <PreviewGrid previews={item.previews} />
      <div className="p-4">
        <h3 className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">
          {item.title}
        </h3>
        <div className="flex justify-between items-center mt-2">
          <span className="text-muted text-xs hover:text-accent transition-colors" onClick={(e) => { e.stopPropagation(); router.push(`/creator/${item.creator.id}`); }}>{item.creator.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-muted text-xs inline-flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>{item.likeCount || 0}</span>
            <span className="text-muted text-xs inline-flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" /></svg>{item.commentCount || 0}</span>
            <span className="text-muted text-xs">{item.totalItems} items</span>
          </div>
        </div>
        <div className="mt-2">
          {item.isFree ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">Free</span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium">{item.tokenPrice} tokens</span>
          )}
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;

export default function FavoritesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchFavorites = useCallback(async (pageNum: number, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await userApi.listFavorites({ page: pageNum, limit: PAGE_SIZE });
      const data = res.data as { items: ContentItem[]; total: number };
      const newItems = data.items || [];
      if (append) {
        setContent(prev => [...prev, ...newItems]);
      } else {
        setContent(newItems);
      }
      setHasMore(pageNum * PAGE_SIZE < data.total);
    } catch {
      if (!append) setContent([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    pageRef.current = 1;
    setHasMore(true);
    fetchFavorites(1, false);
  }, [authLoading, isAuthenticated, fetchFavorites]);

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          pageRef.current += 1;
          fetchFavorites(pageRef.current, true);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, fetchFavorites]);

  if (!isAuthenticated) return <ProtectedRoute><div /></ProtectedRoute>;

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight mb-6 md:mb-8">
        My Favorites
      </h1>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" /></div>
      ) : content.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-12 h-12 mx-auto text-muted mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>
          <p className="text-muted text-sm">No favorites yet. Browse content and save your favorites!</p>
        </div>
      ) : (
        <>
          <div className="columns-2 lg:columns-3 xl:columns-5 gap-5">
            {content.map((item) => (
              <div key={item.id} className="break-inside-avoid mb-5">
                <ContentCard item={item} />
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
          {!hasMore && content.length > 0 && (
            <p className="text-center text-muted text-xs py-8">No more content</p>
          )}
        </>
      )}
    </div>
  );
}
