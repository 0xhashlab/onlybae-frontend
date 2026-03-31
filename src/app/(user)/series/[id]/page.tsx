'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { userApi } from '@/utils/api';

export default function SeriesDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [series, setSeries] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userApi.getSeriesDetail(id).then(res => {
      setSeries(res.data);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-2 border-border border-t-accent rounded-full animate-spin" /></div>;
  if (!series) return <div className="text-center py-20"><p className="text-muted">Series not found.</p></div>;

  return (
    <div>
      <button onClick={() => router.back()} className="text-sm text-muted hover:text-foreground mb-4 cursor-pointer flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
        Back
      </button>

      <div className="flex gap-6 mb-8">
        {series.coverUrl ? (
          <img src={series.coverUrl} alt={series.title} className="w-48 h-64 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-48 h-64 rounded-xl bg-surface-hover flex items-center justify-center shrink-0">
            <svg className="w-16 h-16 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>
          </div>
        )}
        <div>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">{series.title}</h1>
          <p className="text-sm text-muted mt-1">by {series.creator?.name}</p>
          {series.description && <p className="text-sm text-secondary mt-3">{series.description}</p>}
          <p className="text-sm text-muted mt-2">{series.episodes?.length || 0} episodes</p>
        </div>
      </div>

      <h2 className="text-lg font-medium text-foreground mb-4">Episodes</h2>
      <div className="space-y-3">
        {(series.episodes || []).map((ep: any) => (
          <div
            key={ep.id}
            onClick={() => router.push(`/content/${ep.id}`)}
            className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-accent/50 transition-colors group"
          >
            <div className="w-20 h-14 rounded-lg bg-surface-hover overflow-hidden shrink-0 flex items-center justify-center">
              {ep.previews?.[0]?.url ? (
                <img src={ep.previews[0].url} alt="" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-6 h-6 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909" /></svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {ep.episodeNumber && <span className="text-xs text-accent font-medium">Ep {ep.episodeNumber}</span>}
                <h3 className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">{ep.title}</h3>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted mt-1">
                <span>{ep.totalItems} items</span>
                <span>{ep.isFree ? 'Free' : `${ep.tokenPrice} tokens`}</span>
                <span>{new Date(ep.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            {!ep.isUnlocked && !ep.isFree && (
              <svg className="w-4 h-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
            )}
          </div>
        ))}
        {(!series.episodes || series.episodes.length === 0) && (
          <p className="text-sm text-muted py-8 text-center">No episodes yet.</p>
        )}
      </div>
    </div>
  );
}
