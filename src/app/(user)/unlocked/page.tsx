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

function useColumnCount() {
  const [cols, setCols] = useState(2);
  useEffect(() => {
    const update = () => { const w = window.innerWidth; setCols(w >= 1280 ? 5 : w >= 1024 ? 3 : 2); };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return cols;
}

function MasonryGrid({ items, children }: { items: ContentItem[]; children: (item: ContentItem) => React.ReactNode }) {
  const cols = useColumnCount();
  const columns: ContentItem[][] = Array.from({ length: cols }, () => []);
  const heights = new Array(cols).fill(0);
  items.forEach((item) => {
    const shortest = heights.indexOf(Math.min(...heights));
    columns[shortest].push(item);
    const p = item.previews[0];
    const cnt = item.previews.length;
    const r = p?.width && p?.height ? p.height / p.width : p?.orientation === 'landscape' ? 9 / 16 : p?.orientation === 'square' ? 1 : 4 / 3;
    heights[shortest] += (cnt >= 4 ? r : cnt === 2 ? r / 2 : r) + 0.35;
  });
  return (
    <div className="flex gap-3 md:gap-5 w-full">
      {columns.map((col, i) => (
        <div key={i} className="flex-1 min-w-0 flex flex-col gap-3 md:gap-5">
          {col.map((item) => children(item))}
        </div>
      ))}
    </div>
  );
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
  tokenCost: number;
  unlockedAt: string;
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

function PreviewGrid({ previews }: { previews: PreviewItem[] }) {
  if (previews.length === 0) return <div style={{ aspectRatio: '3 / 4' }} className="bg-surface-hover flex items-center justify-center text-muted">No preview</div>;
  if (previews.length === 1) {
    const p = previews[0];
    return <div className="bg-surface-hover relative overflow-hidden" style={getAspectStyle(p)}><PreviewMedia p={p} /></div>;
  }
  if (previews.length === 2) {
    const p = previews[0];
    const dualAspect = p.width && p.height ? { aspectRatio: `${p.width * 2} / ${p.height}` } : { aspectRatio: '4 / 3' };
    return (
      <div className="flex gap-px overflow-hidden" style={dualAspect}>
        {previews.map((p, i) => <div key={i} className="flex-1 relative overflow-hidden"><PreviewMedia p={p} /></div>)}
      </div>
    );
  }
  const p0 = previews[0];
  const quadAspect = p0.width && p0.height ? { aspectRatio: `${p0.width} / ${p0.height}` } : { aspectRatio: '1 / 1' };
  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-px overflow-hidden" style={quadAspect}>
      {previews.slice(0, 4).map((p, i) => <div key={i} className="relative overflow-hidden"><PreviewMedia p={p} /></div>)}
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
      <div className="p-3">
        <h3 className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">
          {item.title}
        </h3>
        <p
          className="text-muted text-xs mt-1 truncate hover:text-accent transition-colors"
          onClick={(e) => { e.stopPropagation(); router.push(`/creator/${item.creator.id}`); }}
        >{item.creator.name}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-muted text-xs">
            {item.tokenCost > 0 ? `${item.tokenCost} tokens` : 'Free'}
          </span>
          <span className="text-muted text-xs">
            {new Date(item.unlockedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;

export default function UnlockedPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchUnlocked = useCallback(async (pageNum: number, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await userApi.listUnlocked({ page: pageNum, limit: PAGE_SIZE });
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
    fetchUnlocked(1, false);
  }, [authLoading, isAuthenticated, fetchUnlocked]);

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          pageRef.current += 1;
          fetchUnlocked(pageRef.current, true);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, fetchUnlocked]);

  if (!isAuthenticated) return <ProtectedRoute><div /></ProtectedRoute>;

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight mb-6 md:mb-8">
        Unlocked Content
      </h1>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" /></div>
      ) : content.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-12 h-12 mx-auto text-muted mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
          <p className="text-muted text-sm">No unlocked content yet. Browse and unlock premium content!</p>
        </div>
      ) : (
        <>
          <MasonryGrid items={content}>
            {(item) => <ContentCard key={item.id} item={item} />}
          </MasonryGrid>
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
