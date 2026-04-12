'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { userApi } from '@/utils/api';

interface PreviewItem {
  url: string | null;
  locked: boolean;
  type: string;
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
  favoriteCount: number;
  totalItems: number;
  previews: PreviewItem[];
  creator: { id: string; name: string; avatarUrl?: string };
}

interface CreatorProfile {
  id: string;
  name: string;
  avatarUrl?: string;
  contentCount: number;
  seriesCount: number;
}

function PreviewGrid({ previews }: { previews: PreviewItem[] }) {
  if (previews.length === 0) {
    return <div className="h-52 bg-surface-hover flex items-center justify-center text-muted">No preview</div>;
  }

  const renderItem = (p: PreviewItem, height: string, iconSize: string) => (
    <div className={`${height} bg-surface-hover relative overflow-hidden`}>
      {p.url ? (
        <img src={p.url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-surface-hover" />
      )}
      {p.locked && (
        <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
          <svg className={`text-white ${iconSize} drop-shadow`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
        </div>
      )}
    </div>
  );

  if (previews.length === 1) return renderItem(previews[0], 'h-52', 'w-6 h-6');

  if (previews.length === 2) {
    return (
      <div className="h-52 flex gap-px overflow-hidden">
        {previews.map((p, i) => (
          <div key={i} className="flex-1 relative overflow-hidden">
            {renderItem(p, 'h-full', 'w-5 h-5')}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="h-52 grid grid-cols-2 grid-rows-2 gap-px overflow-hidden">
      {previews.slice(0, 4).map((p, i) => (
        <div key={i} className="relative overflow-hidden">
          {renderItem(p, 'h-full', 'w-4 h-4')}
        </div>
      ))}
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
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3 text-muted text-xs">
            <span className="inline-flex items-center gap-0.5"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>{item.likeCount || 0}</span>
            <span className="inline-flex items-center gap-0.5"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" /></svg>{item.commentCount || 0}</span>
            <span className="inline-flex items-center gap-0.5"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" /></svg>{item.favoriteCount || 0}</span>
          </div>
          {item.isFree ? (
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">Free</span>
          ) : (
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium">{item.tokenPrice} tokens</span>
          )}
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;

export default function CreatorProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchContent = useCallback(async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true);
    try {
      const res = await userApi.browseContent({
        creatorId: id as string,
        page: pageNum,
        limit: PAGE_SIZE,
      });
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
      setLoadingMore(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await userApi.getCreatorProfile(id as string);
        setCreator(res.data as CreatorProfile);
        await fetchContent(1, false);
      } catch {
        setCreator(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, fetchContent]);

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          pageRef.current += 1;
          fetchContent(pageRef.current, true);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, fetchContent]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted text-sm mb-4">Creator not found</p>
        <button onClick={() => router.back()} className="text-sm text-accent hover:underline cursor-pointer">Go back</button>
      </div>
    );
  }

  return (
    <div>
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

      {/* Creator header */}
      <div className="flex items-center gap-5 mb-8">
        {creator.avatarUrl ? (
          <img src={creator.avatarUrl} alt={creator.name} className="w-16 h-16 rounded-full object-cover border-2 border-border" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-surface-hover border-2 border-border flex items-center justify-center">
            <span className="text-2xl text-muted">{creator.name.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">{creator.name}</h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted">
            <span>{creator.contentCount} contents</span>
            {creator.seriesCount > 0 && <span>{creator.seriesCount} series</span>}
          </div>
        </div>
      </div>

      {/* Content grid */}
      {content.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted text-sm">No content yet</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {content.map((item) => (
              <ContentCard key={item.id} item={item} />
            ))}
          </div>
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
