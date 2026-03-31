'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { userApi } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

interface ContentDetail {
  id: string;
  title: string;
  description: string;
  type: string;
  isFree: boolean;
  tokenPrice: number;
  isUnlocked: boolean;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isFavorited: boolean;
  creator: { id: string; name: string; avatarUrl?: string };
  createdAt: string;
  series?: { id: string; title: string };
  episodeNumber?: number;
  workflowJson?: string;
}

interface ContentItemData {
  id: string;
  url: string | null;
  type: string;
  sortOrder: number;
  locked: boolean;
  isFreePreview: boolean;
}

function Lightbox({ items, index, onClose, onPrev, onNext }: {
  items: ContentItemData[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const item = items[index];

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onPrev, onNext]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white z-10 cursor-pointer"
      >
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 text-white/70 text-sm">
        {index + 1} / {items.length}
      </div>

      {/* Previous */}
      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white cursor-pointer"
        >
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
      )}

      {/* Next */}
      {index < items.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white cursor-pointer"
        >
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      )}

      {/* Content */}
      <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {item.type === 'image' ? (
          <img src={item.url!} alt="" className="max-w-full max-h-[90vh] object-contain" />
        ) : (
          <video src={item.url!} controls autoPlay className="max-w-full max-h-[90vh]" />
        )}
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
          {/* Hero image */}
          {items.length > 0 && items[0].url && (
            <div className="w-full md:w-80 h-64 bg-surface-hover relative overflow-hidden flex-shrink-0">
              <img src={items[0].url} alt={content.title} className="w-full h-full object-cover" />
              {items[0].locked && (
                <div className="absolute inset-0 bg-black/15 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white drop-shadow" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                </div>
              )}
            </div>
          )}

          {/* Details */}
          <div className="flex-1 p-6">
            {content.series && (
              <a href={`/series/${content.series.id}`} className="text-xs text-accent hover:underline">
                Part of: {content.series.title} {content.episodeNumber ? `· Episode ${content.episodeNumber}` : ''}
              </a>
            )}
            <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-2">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`aspect-square rounded-xl overflow-hidden bg-surface-hover relative ${
              !item.locked && item.url ? 'cursor-pointer hover:ring-2 hover:ring-accent/50 transition-all' : ''
            }`}
            onClick={() => !item.locked && item.url && openLightbox(item.id)}
          >
            {item.locked ? (
              <>
                {item.url ? (
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-surface-hover" />
                )}
                <div className="absolute inset-0 bg-black/15 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white drop-shadow" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                </div>
              </>
            ) : (
              item.type === 'image' ? (
                <>
                  <img src={item.url!} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                    <svg className="w-6 h-6 text-white drop-shadow" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6" />
                    </svg>
                  </div>
                </>
              ) : (
                <video src={item.url!} controls className="w-full h-full object-cover" />
              )
            )}
          </div>
        ))}
      </div>

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
