'use client';

import { useRouter } from 'next/navigation';
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

interface TagItem {
  id: string;
  name: string;
}

function PreviewGrid({ previews }: { previews: PreviewItem[] }) {
  if (previews.length === 0) {
    return <div className="h-52 bg-surface-hover flex items-center justify-center text-muted">No preview</div>;
  }

  const renderItem = (p: PreviewItem, height: string, iconSize: string) => (
    <div className={`${height} bg-surface-hover relative overflow-hidden`}>
      {p.url ? (
        <img src={p.url} alt="" className="w-full h-full object-cover" />
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
        <p
          className="text-muted text-xs mt-1 truncate hover:text-accent transition-colors"
          onClick={(e) => { e.stopPropagation(); router.push(`/creator/${item.creator.id}`); }}
        >{item.creator.name}</p>
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

const tabs = [
  { key: 'all', label: 'All' },
  { key: 'photoset', label: 'Photo Sets' },
  { key: 'video', label: 'Videos' },
  { key: 'mixed', label: 'Mixed' },
];

const PAGE_SIZE = 20;

export default function BrowsePage() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeType, setActiveType] = useState<string>('all');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Fetch tags on mount
  useEffect(() => {
    userApi.getTags().then(res => {
      setTags((res.data as unknown as TagItem[]) || []);
    }).catch(() => {});
  }, []);

  // Fetch content (initial or filter change)
  const fetchContent = useCallback(async (type: string, tag: string | null, pageNum: number, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await userApi.browseContent({
        type: type === 'all' ? undefined : type,
        tag: tag || undefined,
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
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Reset and fetch on filter change
  useEffect(() => {
    pageRef.current = 1;
    setHasMore(true);
    fetchContent(activeType, activeTag, 1, false);
  }, [activeType, activeTag, fetchContent]);

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          pageRef.current += 1;
          fetchContent(activeType, activeTag, pageRef.current, true);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, activeType, activeTag, fetchContent]);

  const handleTagClick = (tagName: string) => {
    setActiveTag(prev => prev === tagName ? null : tagName);
  };

  return (
    <div>
      <h1 className="text-3xl font-semibold text-foreground tracking-tight mb-6">
        Browse
      </h1>

      <div className="flex gap-1 mb-4 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveType(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors duration-150 border-b-2 -mb-px cursor-pointer ${
              activeType === tab.key
                ? 'border-accent text-foreground'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handleTagClick(tag.name)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors duration-150 cursor-pointer ${
                activeTag === tag.name
                  ? 'bg-accent text-background border-accent'
                  : 'bg-surface border-border text-muted hover:text-foreground hover:border-foreground/30'
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" /></div>
      ) : content.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-12 h-12 mx-auto text-muted mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.75 7.5h16.5" /></svg>
          <p className="text-muted text-sm">No content available</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {content.map((item) => (
              <ContentCard key={item.id} item={item} />
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
