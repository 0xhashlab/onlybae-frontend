'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { userApi } from '@/utils/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faLock, faBookOpen } from '@fortawesome/free-solid-svg-icons';

interface Chapter {
  id: string;
  title: string;
  isFree: boolean;
  isUnlocked: boolean;
  tokenPrice: number;
  orderInSeries: number | null;
  totalItems: number;
  coverUrl?: string | null;
  previews?: { url: string | null; locked: boolean }[];
  createdAt: string;
}

interface ComicDetail {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  contentCount: number;
  type: 'normal' | 'reels' | 'comic';
  creator?: { id: string; name: string; avatarUrl?: string };
  contents: Chapter[];
}

export default function ComicDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [series, setSeries] = useState<ComicDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userApi.getSeriesDetail(id).then(res => {
      setSeries(res.data);
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
    return (
      <div className="text-center py-20">
        <p className="text-muted">Comic not found.</p>
      </div>
    );
  }

  const chapters = series.contents || [];

  return (
    <div>
      <button
        onClick={() => router.push('/comics')}
        className="text-sm text-muted hover:text-foreground transition-colors mb-4 cursor-pointer flex items-center gap-1"
      >
        <FontAwesomeIcon icon={faChevronLeft} className="w-3 h-3" />
        Back to Comic
      </button>

      {/* Hero: comic-style portrait cover + details */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-8">
        <div className="w-40 md:w-52 aspect-[2/3] rounded-lg overflow-hidden bg-surface-hover border border-border shrink-0 mx-auto md:mx-0">
          {series.coverUrl ? (
            <img src={series.coverUrl} alt={series.title} decoding="async" fetchPriority="high" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FontAwesomeIcon icon={faBookOpen} className="w-10 h-10 text-muted" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">{series.title}</h1>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-semibold tracking-wide">COMIC</span>
          </div>
          {series.creator && (
            <p className="text-sm text-muted mt-1">by {series.creator.name}</p>
          )}
          {series.description && (
            <p className="text-sm text-secondary mt-3 whitespace-pre-line">{series.description}</p>
          )}
          <p className="text-sm text-muted mt-2">{chapters.length} chapters</p>
        </div>
      </div>

      <h2 className="text-lg font-medium text-foreground mb-4">Chapters</h2>
      {chapters.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">No chapters yet.</p>
      ) : (
        <div className="space-y-2">
          {chapters.map((ch) => {
            const canRead = ch.isUnlocked || ch.isFree;
            return (
              <div
                key={ch.id}
                onClick={() => canRead ? router.push(`/comics/${series.id}/read/${ch.id}`) : router.push(`/content/${ch.id}`)}
                className="bg-surface border border-border rounded-lg p-3 md:p-4 flex items-center gap-3 md:gap-4 cursor-pointer hover:border-accent/50 transition-colors group"
              >
                <div className="w-14 h-20 rounded bg-surface-hover overflow-hidden shrink-0">
                  {(ch.coverUrl || ch.previews?.[0]?.url) ? (
                    <img
                      src={ch.coverUrl || ch.previews?.[0]?.url || ''}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FontAwesomeIcon icon={faBookOpen} className="w-5 h-5 text-muted" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {ch.orderInSeries && (
                      <span className="text-xs text-accent font-medium">Ch {ch.orderInSeries}</span>
                    )}
                    <h3 className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">
                      {ch.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted mt-1">
                    <span>{ch.totalItems} pages</span>
                    <span>{ch.isFree ? 'Free' : `${ch.tokenPrice} tokens`}</span>
                    <span className="hidden sm:inline">{new Date(ch.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {!canRead && (
                  <FontAwesomeIcon icon={faLock} className="w-4 h-4 text-muted shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
