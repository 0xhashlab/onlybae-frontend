'use client';

import { useState, useEffect, useCallback } from 'react';
import { userApi } from '@/utils/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faLock } from '@fortawesome/free-solid-svg-icons';

interface Episode {
  id: string;
  title: string;
  isFree: boolean;
  isUnlocked: boolean;
  tokenPrice: number;
  orderInSeries: number | null;
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
        className="relative w-full md:max-w-sm md:rounded-2xl rounded-t-2xl bg-surface border-t md:border border-border flex flex-col shadow-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar (mobile only) */}
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

        {/* Episode grid */}
        <div className="overflow-y-auto max-h-[45vh] md:max-h-[60vh]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <p className="text-red-400 text-sm text-center py-6">{error}</p>
          ) : episodes.length === 0 ? (
            <p className="text-muted text-sm text-center py-8">No episodes yet.</p>
          ) : (
            <div className="grid grid-cols-10 gap-1.5 p-3">
              {episodes.map(ep => {
                const isCurrent = ep.id === currentEpisodeId;
                const canWatch = ep.isUnlocked || ep.isFree;
                return (
                  <button
                    key={ep.id}
                    type="button"
                    onClick={() => handleSelect(ep.id)}
                    aria-label={`Episode ${ep.orderInSeries ?? ep.title}`}
                    className={`relative aspect-square rounded-md flex items-center justify-center text-[11px] font-bold cursor-pointer transition-colors select-none ${
                      isCurrent
                        ? 'bg-accent text-black'
                        : canWatch
                          ? 'bg-surface-hover text-foreground hover:bg-border'
                          : 'bg-surface-hover/50 text-muted/70 hover:bg-surface-hover'
                    }`}
                  >
                    {ep.orderInSeries ?? '?'}
                    {!canWatch && (
                      <div className="absolute top-0.5 right-0.5 flex items-center gap-px leading-none">
                        <FontAwesomeIcon icon={faLock} className="w-[7px] h-[7px] text-muted/70" />
                        {ep.tokenPrice > 0 && (
                          <span className="text-[7px] text-muted/70">{ep.tokenPrice}</span>
                        )}
                      </div>
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
