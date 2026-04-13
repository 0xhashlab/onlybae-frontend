'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { userApi } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faUser, faPaperPlane } from '@fortawesome/free-solid-svg-icons';

interface CommentItem {
  id: string;
  text: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl?: string };
}

interface CommentsDrawerProps {
  contentId: string | null;
  onClose: () => void;
  onCommentAdded?: () => void;
}

export default function CommentsDrawer({ contentId, onClose, onCommentAdded }: CommentsDrawerProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const open = contentId !== null;

  // Fetch comments when drawer opens
  useEffect(() => {
    if (!open || !contentId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await userApi.getComments(contentId, { page: 1, limit: 50 });
        if (cancelled) return;
        const data = res.data as { items: CommentItem[] };
        setComments(data.items || []);
      } catch (err) {
        if (!cancelled) setError((err as Error).message || 'Failed to load comments');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, contentId]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentId || !text.trim() || submitting) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setSubmitting(true);
    try {
      const res = await userApi.addComment(contentId, text.trim());
      const newComment = res.data as CommentItem;
      setComments(prev => [newComment, ...prev]);
      setText('');
      onCommentAdded?.();
    } catch (err) {
      setError((err as Error).message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  }, [contentId, text, submitting, isAuthenticated, router, onCommentAdded]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end md:items-center md:justify-center" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative w-full md:max-w-lg md:rounded-2xl rounded-t-2xl bg-surface border-t md:border border-border flex flex-col max-h-[85vh] md:max-h-[80vh] shadow-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (mobile affordance) */}
        <div className="md:hidden pt-2 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-muted" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">Comments</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface-hover text-foreground cursor-pointer"
          >
            <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <p className="text-red-400 text-sm text-center py-6">{error}</p>
          ) : comments.length === 0 ? (
            <p className="text-muted text-sm text-center py-10">No comments yet. Be the first to comment.</p>
          ) : (
            <div className="space-y-4">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-surface-hover overflow-hidden shrink-0 flex items-center justify-center">
                    {c.user.avatarUrl ? (
                      <img src={c.user.avatarUrl} alt={c.user.name} className="w-full h-full object-cover" />
                    ) : (
                      <FontAwesomeIcon icon={faUser} className="w-4 h-4 text-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{c.user.name}</span>
                      <span className="text-[11px] text-muted">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-secondary whitespace-pre-wrap break-words mt-0.5">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 px-4 py-3 border-t border-border"
        >
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isAuthenticated ? 'Add a comment...' : 'Log in to comment'}
            disabled={!isAuthenticated || submitting}
            className="flex-1 h-10 px-3 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!isAuthenticated || !text.trim() || submitting}
            aria-label="Send"
            className="w-10 h-10 rounded-lg bg-accent text-white flex items-center justify-center disabled:opacity-40 cursor-pointer"
          >
            <FontAwesomeIcon icon={faPaperPlane} className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
