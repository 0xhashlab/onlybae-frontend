'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { userApi } from '@/utils/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faPlay, faLock, faVideo } from '@fortawesome/free-solid-svg-icons';

interface ReelsEpisode {
  id: string;
  title: string;
  isFree: boolean;
  isUnlocked: boolean;
  tokenPrice: number;
  orderInSeries: number | null;
  totalItems: number;
  coverUrl?: string | null;
  previews?: { url: string | null; locked: boolean }[];
  likeCount?: number;
  createdAt: string;
}

interface ReelsSeriesDetail {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  type: 'normal' | 'reels' | 'comic';
  contentCount: number;
  creator?: { id: string; name: string; avatarUrl?: string };
  contents: ReelsEpisode[];
}

export default function ReelsSeriesDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [series, setSeries] = useState<ReelsSeriesDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userApi.getSeriesDetail(id).then(res => {
      setSeries(res.data as ReelsSeriesDetail);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-2 border-border border-t-accent rounded-full animate-spin" />
      </div>
    );
  }
  if (!series) {
    return <div className="text-center py-20"><p className="text-muted">Series not found.</p></div>;
  }
  // Safety: if someone opened a non-reels series via this route, redirect to the right place.
  if (series.type === 'comic') { router.replace(`/comics/${id}`); return null; }
  if (series.type === 'normal') { router.replace(`/series/${id}`); return null; }

  const episodes = (series.contents || []).slice().sort((a, b) => (a.orderInSeries ?? 0) - (b.orderInSeries ?? 0));
  const firstEp = episodes[0];

  const playFromStart = () => {
    if (firstEp) router.push(`/reels?seriesId=${id}&start=${firstEp.id}`);
    else router.push(`/reels?seriesId=${id}`);
  };

  return (
    <div>
      <button
        onClick={() => router.push('/reels/browse')}
        className="text-sm text-muted hover:text-foreground transition-colors mb-4 cursor-pointer flex items-center gap-1"
      >
        <FontAwesomeIcon icon={faChevronLeft} className="w-3 h-3" />
        All Reels
      </button>

      {/*
        Mobile: centered hero — cover on top, then title / badge / creator /
        description / episode count, then a wide "Play from Ep 1" button.
        Desktop: keeps the side-by-side layout so wider screens feel filled.
      */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-5 md:gap-8 mb-8 md:mb-10">
        {/* Cover — larger and centered on mobile to feel like a real show poster. */}
        <div className="w-56 md:w-60 aspect-[9/16] rounded-xl overflow-hidden bg-surface-hover border border-border shrink-0 shadow-xl shadow-black/40">
          {series.coverUrl ? (
            <img
              src={series.coverUrl}
              alt={series.title}
              decoding="async"
              fetchPriority="high"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FontAwesomeIcon icon={faVideo} className="w-10 h-10 text-muted" />
            </div>
          )}
        </div>

        {/* Info block. Centered text on mobile; left-aligned on desktop so it
            reads across from the cover naturally. */}
        <div className="flex-1 min-w-0 w-full flex flex-col items-center md:items-start text-center md:text-left">
          <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">{series.title}</h1>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold tracking-wide">REELS</span>
          </div>
          <p className="text-xs text-muted mt-1">
            {series.creator ? `by ${series.creator.name} · ` : ''}{episodes.length} episode{episodes.length === 1 ? '' : 's'}
          </p>
          {series.description && (
            <p className="text-sm text-secondary mt-4 max-w-md whitespace-pre-line leading-relaxed">{series.description}</p>
          )}

          {firstEp && (
            <button
              onClick={playFromStart}
              className="mt-6 w-full md:w-auto max-w-sm h-12 px-8 rounded-full bg-accent text-white font-semibold text-sm cursor-pointer hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
            >
              <FontAwesomeIcon icon={faPlay} className="w-3.5 h-3.5" />
              Play from Ep {firstEp.orderInSeries ?? 1}
            </button>
          )}
        </div>
      </div>

      {/* Episodes list */}
      <h2 className="text-lg font-semibold text-foreground mb-3">Episodes</h2>
      {episodes.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">No episodes yet.</p>
      ) : (
        <div className="space-y-2">
          {episodes.map((ep) => {
            const canWatch = ep.isUnlocked || ep.isFree;
            return (
              <div
                key={ep.id}
                onClick={() => router.push(`/reels?seriesId=${id}&start=${ep.id}`)}
                className="bg-surface border border-border rounded-xl p-2.5 md:p-3 flex items-center gap-3 md:gap-4 cursor-pointer hover:border-accent/50 transition-colors group"
              >
                {/* 9:16 thumb matches the reels aspect so list and feed feel unified. */}
                <div className="w-[72px] aspect-[9/16] rounded-lg bg-surface-hover overflow-hidden shrink-0">
                  {(ep.coverUrl || ep.previews?.[0]?.url) ? (
                    <img
                      src={ep.coverUrl || ep.previews?.[0]?.url || ''}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FontAwesomeIcon icon={faVideo} className="w-5 h-5 text-muted" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {ep.orderInSeries && (
                      <span className="text-xs text-accent font-semibold">Ep {ep.orderInSeries}</span>
                    )}
                    <h3 className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">
                      {ep.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted mt-1">
                    <span>{ep.isFree ? 'Free' : `${ep.tokenPrice} tokens`}</span>
                    <span className="hidden sm:inline">{new Date(ep.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {canWatch ? (
                  <FontAwesomeIcon icon={faPlay} className="w-4 h-4 text-accent shrink-0 mr-1" />
                ) : (
                  <FontAwesomeIcon icon={faLock} className="w-4 h-4 text-muted shrink-0 mr-1" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
