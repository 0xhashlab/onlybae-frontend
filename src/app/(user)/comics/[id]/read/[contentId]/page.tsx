'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { userApi } from '@/utils/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faXmark, faList } from '@fortawesome/free-solid-svg-icons';

interface PageItem {
  id: string;
  url: string | null;
  locked: boolean;
  type: string;
  width?: number | null;
  height?: number | null;
  sortOrder?: number;
}

interface ChapterDetail {
  id: string;
  title: string;
  isUnlocked: boolean;
  isFree: boolean;
  tokenPrice: number;
  orderInSeries?: number | null;
  series?: { id: string; title: string; type?: string };
}

interface SeriesContents {
  id: string;
  title: string;
  contents: { id: string; title: string; orderInSeries: number | null; isUnlocked: boolean; isFree: boolean }[];
}

export default function ComicReader() {
  const params = useParams();
  const router = useRouter();
  const seriesId = params.id as string;
  const contentId = params.contentId as string;

  const [chapter, setChapter] = useState<ChapterDetail | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [series, setSeries] = useState<SeriesContents | null>(null);
  const [loading, setLoading] = useState(true);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [chapterListOpen, setChapterListOpen] = useState(false);
  const pageRefs = useRef<Map<number, HTMLImageElement>>(new Map());
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load chapter + pages + surrounding series (for prev/next chapter nav)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [detailRes, itemsRes, seriesRes] = await Promise.all([
          userApi.getContentDetail(contentId),
          userApi.getContentItems(contentId),
          userApi.getSeriesDetail(seriesId),
        ]);
        if (cancelled) return;
        setChapter(detailRes.data as ChapterDetail);
        const items = (itemsRes.data as { items: PageItem[] }).items || [];
        // Only images, sorted by sortOrder
        const imagePages = items
          .filter(i => i.type === 'image')
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        setPages(imagePages);
        setSeries(seriesRes.data as SeriesContents);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [contentId, seriesId]);

  // Scroll-to-top when chapter changes
  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0 });
    setCurrentPage(1);
  }, [contentId]);

  // Track current page via IntersectionObserver
  useEffect(() => {
    const root = containerRef.current;
    if (!root || pages.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let best: { idx: number; ratio: number } | null = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = Number(entry.target.getAttribute('data-page'));
          if (Number.isNaN(idx)) continue;
          if (!best || entry.intersectionRatio > best.ratio) {
            best = { idx, ratio: entry.intersectionRatio };
          }
        }
        if (best) setCurrentPage(best.idx + 1);
      },
      { root, threshold: [0.3, 0.6] }
    );
    pageRefs.current.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [pages.length]);

  const toggleChrome = useCallback(() => setChromeVisible(v => !v), []);

  // Keyboard nav: esc closes, arrows jump pages
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (chapterListOpen) setChapterListOpen(false);
        else router.push(`/comics/${seriesId}`);
      } else if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        containerRef.current?.scrollBy({ top: window.innerHeight * 0.9, behavior: 'smooth' });
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        containerRef.current?.scrollBy({ top: -window.innerHeight * 0.9, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [router, seriesId, chapterListOpen]);

  const chaptersOrdered = (series?.contents || [])
    .slice()
    .sort((a, b) => (a.orderInSeries ?? 0) - (b.orderInSeries ?? 0));
  const currentIdx = chaptersOrdered.findIndex(c => c.id === contentId);
  const prevChapter = currentIdx > 0 ? chaptersOrdered[currentIdx - 1] : null;
  const nextChapter = currentIdx >= 0 && currentIdx < chaptersOrdered.length - 1 ? chaptersOrdered[currentIdx + 1] : null;

  const goToChapter = (ch: { id: string; isUnlocked: boolean; isFree: boolean }) => {
    if (!ch.isUnlocked && !ch.isFree) {
      router.push(`/content/${ch.id}`);
      return;
    }
    router.push(`/comics/${seriesId}/read/${ch.id}`);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50 text-white/80">
        <p>Chapter not found.</p>
      </div>
    );
  }

  if (!chapter.isUnlocked && !chapter.isFree) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 text-white gap-4 px-6">
        <p className="text-lg font-semibold">This chapter is locked</p>
        <button
          onClick={() => router.push(`/content/${contentId}`)}
          className="h-11 px-6 rounded-full bg-accent text-white font-semibold text-sm cursor-pointer"
        >
          Unlock for {chapter.tokenPrice} tokens
        </button>
        <button
          onClick={() => router.push(`/comics/${seriesId}`)}
          className="text-white/70 text-sm cursor-pointer hover:text-white"
        >
          Back to chapter list
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Scrollable pages container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-y-auto overflow-x-hidden"
        onClick={toggleChrome}
      >
        <div className="min-h-full flex flex-col items-center py-2 md:py-4">
          {pages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-white/60 py-20">
              <p>No pages available.</p>
            </div>
          ) : (
            pages.map((p, idx) => (
              <img
                key={p.id}
                ref={el => { if (el) pageRefs.current.set(idx, el); else pageRefs.current.delete(idx); }}
                data-page={idx}
                src={p.url ?? ''}
                alt={`Page ${idx + 1}`}
                className="w-full md:max-w-3xl block select-none"
                loading={idx < 3 ? 'eager' : 'lazy'}
                draggable={false}
              />
            ))
          )}

          {/* End-of-chapter next-chapter CTA */}
          {pages.length > 0 && (
            <div
              className="w-full max-w-xl px-4 py-12 flex flex-col items-center gap-4 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-white/60 text-sm">End of chapter {chapter.orderInSeries ?? ''}</p>
              {nextChapter ? (
                <button
                  onClick={() => goToChapter(nextChapter)}
                  className="h-12 px-6 rounded-full bg-accent text-white font-semibold cursor-pointer flex items-center gap-2"
                >
                  Next chapter
                  <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3" />
                </button>
              ) : (
                <p className="text-white/70 text-sm">You&apos;ve reached the latest chapter.</p>
              )}
              <button
                onClick={() => router.push(`/comics/${seriesId}`)}
                className="text-white/60 text-xs hover:text-white cursor-pointer underline"
              >
                Back to chapter list
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Top chrome */}
      <div
        className={`absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent pointer-events-none transition-opacity ${chromeVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="flex items-center gap-3 px-4 py-3 pointer-events-auto" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <button
            onClick={() => router.push(`/comics/${seriesId}`)}
            aria-label="Close reader"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 backdrop-blur text-white cursor-pointer"
          >
            <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0 text-white">
            <div className="text-sm font-semibold truncate">{chapter.title}</div>
            {series && <div className="text-xs text-white/60 truncate">{series.title}</div>}
          </div>
          <button
            onClick={() => setChapterListOpen(true)}
            aria-label="Chapters"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 backdrop-blur text-white cursor-pointer"
          >
            <FontAwesomeIcon icon={faList} className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom chrome: page counter + prev/next chapter */}
      <div
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none transition-opacity ${chromeVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 pointer-events-auto"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={() => prevChapter && goToChapter(prevChapter)}
            disabled={!prevChapter}
            className="h-10 px-4 rounded-full bg-black/50 backdrop-blur text-white text-sm cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="w-3 h-3" />
            Prev
          </button>
          <div className="text-white text-xs bg-black/50 backdrop-blur rounded-full px-3 py-1.5">
            {currentPage} / {pages.length}
          </div>
          <button
            onClick={() => nextChapter && goToChapter(nextChapter)}
            disabled={!nextChapter}
            className="h-10 px-4 rounded-full bg-black/50 backdrop-blur text-white text-sm cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Next
            <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Chapter list drawer */}
      {chapterListOpen && (
        <div className="absolute inset-0 z-[60] bg-black/70 backdrop-blur-sm flex">
          <div
            className="flex-1"
            onClick={() => setChapterListOpen(false)}
          />
          <aside className="w-80 max-w-[85vw] bg-surface border-l border-border h-full flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-foreground font-semibold">Chapters</h3>
              <button
                onClick={() => setChapterListOpen(false)}
                aria-label="Close"
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-hover text-foreground cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {chaptersOrdered.map(c => {
                const active = c.id === contentId;
                const locked = !c.isUnlocked && !c.isFree;
                return (
                  <button
                    key={c.id}
                    onClick={() => { setChapterListOpen(false); goToChapter(c); }}
                    className={`w-full text-left px-4 py-3 border-b border-border/60 cursor-pointer transition-colors ${active ? 'bg-accent/10' : 'hover:bg-surface-hover'}`}
                  >
                    <div className="flex items-center gap-2">
                      {c.orderInSeries && (
                        <span className={`text-xs font-medium ${active ? 'text-accent' : 'text-muted'}`}>
                          Ch {c.orderInSeries}
                        </span>
                      )}
                      <span className={`text-sm flex-1 truncate ${active ? 'text-foreground font-medium' : 'text-foreground'}`}>
                        {c.title}
                      </span>
                      {locked && <span className="text-[10px] text-muted">🔒</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
