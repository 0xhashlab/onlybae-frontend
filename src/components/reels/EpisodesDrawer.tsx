'use client';

import { useState, useEffect, useCallback } from 'react';
import { userApi } from '@/utils/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faPlay, faLock, faCheckCircle, faVideo } from '@fortawesome/free-solid-svg-icons';

interface Episode {
  id: string;
  title: string;
  isFree: boolean;
  isUnlocked: boolean;
  tokenPrice: number;
  orderInSeries: number | null;
  coverUrl?: string | null;
  status: string;
}

interface SeriesInfo {
  id: string;
  title: string;
  bundlePrice?: number | null;
  isSeriesUnlocked?: boolean;
  contents: Episode[];
}

interface EpisodesDrawerProps {
  seriesId: string | null;
  currentEpisodeId: string | null;
  onClose: () => void;
  onSelectEpisode: (episodeId: string) => void;
}

export default function EpisodesDrawer({
  seriesId,
  currentEpisodeId,
  onClose,
  onSelectEpisode,
}: EpisodesDrawerProps) {
  const [series, setSeries] = useState<SeriesInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = seriesId !== null;

  useEffect(() => {
    if (!open || !seriesId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await userApi.getSeriesDetail(seriesId);
        if (!cancelled) setSeries(res.data as SeriesInfo);
      } catch (err) {
        if (!cancelled) setError((err as Error).message || 'Failed to load episodes');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, seriesId]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const handleSelect = useCallback((episodeId: string) => {
    onSelectEpisode(episodeId);
    onClose();
  }, [onSelectEpisode, onClose]);

  if (!open) return null;

  const episodes = (series?.contents || [])
    .sort((a, b) => (a.orderInSeries ?? 0) - (b.orderInSeries ?? 0));

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center md:justify-center" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div
        className="relative w-full md:max-w-sm md:rounded-2xl rounded-t-2xl bg-surface border-t md:border border-border flex flex-col max-h-[80vh] shadow-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="md:hidden pt-2 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-muted" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground truncate">
              {series?.title || 'Episodes'}
            </h3>
            {series && (
              <p className="text-xs text-muted mt-0.5">{episodes.length} episodes</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface-hover text-foreground cursor-pointer shrink-0 ml-2"
          >
            <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
          </button>
        </div>

        {/* Episode list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <p className="text-red-400 text-sm text-center py-8">{error}</p>
          ) : episodes.length === 0 ? (
            <p className="text-muted text-sm text-center py-10">No episodes yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {episodes.map(ep => {
                const isCurrent = ep.id === currentEpisodeId;
                const canWatch = ep.isUnlocked || ep.isFree;
                return (
                  <button
                    key={ep.id}
                    type="button"
                    onClick={() => handleSelect(ep.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
                      isCurrent ? 'bg-accent/10' : 'hover:bg-surface-hover'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-12 aspect-[9/16] rounded-md bg-surface-hover overflow-hidden shrink-0 relative">
                      {ep.coverUrl ? (
                        <img src={ep.coverUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FontAwesomeIcon icon={faVideo} className="w-3 h-3 text-muted" />
                        </div>
                      )}
                      {/* Lock overlay on thumb */}
                      {!canWatch && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <FontAwesomeIcon icon={faLock} className="w-2.5 h-2.5 text-white/80" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {ep.orderInSeries != null && (
                          <span className={`text-[11px] font-semibold shrink-0 ${isCurrent ? 'text-accent' : 'text-muted'}`}>
                            Ep {ep.orderInSeries}
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent font-medium shrink-0">
                            Playing
                          </span>
                        )}
                      </div>
                      <p className={`text-sm truncate ${isCurrent ? 'text-foreground font-medium' : 'text-foreground'}`}>
                        {ep.title}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {ep.isFree ? (
                          <span className="text-[11px] text-emerald-400 font-medium">Free</span>
                        ) : ep.isUnlocked ? (
                          <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                            <FontAwesomeIcon icon={faCheckCircle} className="w-2.5 h-2.5" />
                            Unlocked
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted flex items-center gap-1">
                            <FontAwesomeIcon icon={faLock} className="w-2.5 h-2.5" />
                            {ep.tokenPrice} tokens
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Play indicator */}
                    {isCurrent ? (
                      <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                        <FontAwesomeIcon icon={faPlay} className="w-2 h-2 text-accent ml-0.5" />
                      </div>
                    ) : (
                      <FontAwesomeIcon
                        icon={canWatch ? faPlay : faLock}
                        className={`w-3.5 h-3.5 shrink-0 ${canWatch ? 'text-muted' : 'text-muted/50'}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
