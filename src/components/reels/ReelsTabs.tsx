'use client';

import { usePathname, useRouter } from 'next/navigation';

// TikTok-style top-center pill tabs that sit over every reels surface.
// `For You` is the default vertical feed (/reels), `Browse All` is the
// series-grid explorer (/reels/browse). Each tab is a real route so the
// URL can be shared and the back button works.
//
// Rendering:
//   - Absolutely positioned inside the fixed /reels shell (which is already
//     top-safe-area clear on mobile). The caller supplies the positioning
//     context by making this a child of that shell.
//   - On /reels the background is a video so the tabs float over it with
//     no container. On /reels/browse the container already has padding so
//     we sit above the grid title area.
export default function ReelsTabs({
  variant = 'overlay',
}: {
  /** 'overlay' floats over dark video (used inside /reels). 'solid' sits in a padded page (used on /reels/browse). */
  variant?: 'overlay' | 'solid';
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Scoped-feed (?seriesId=X) still lives under /reels, but it's a detail
  // view so For You is not the right highlight. Keep the tab visually equal
  // in that case — the caller hides us outright in scoped mode.
  const activeKey: 'foryou' | 'browse' =
    pathname?.startsWith('/reels/browse') ? 'browse' : 'foryou';

  const goto = (key: 'foryou' | 'browse') => {
    if (key === activeKey) return;
    router.push(key === 'foryou' ? '/reels' : '/reels/browse');
  };

  const textClass = (active: boolean) => {
    if (variant === 'overlay') {
      return active ? 'text-white' : 'text-white/60';
    }
    return active ? 'text-foreground' : 'text-muted';
  };

  const indicatorClass = variant === 'overlay' ? 'bg-white' : 'bg-foreground';

  // Overlay variant floats over the fixed /reels shell (top-safe-area aware).
  // Solid variant lives in a standard flow position at the top of the page.
  const containerClass =
    variant === 'overlay'
      ? 'absolute z-30 left-1/2 -translate-x-1/2 flex items-center gap-6 px-2'
      : 'flex items-center justify-center gap-6 px-2 mb-4';
  const containerStyle =
    variant === 'overlay'
      ? { top: 'calc(0.75rem + env(safe-area-inset-top))' }
      : undefined;

  return (
    <div className={containerClass} style={containerStyle}>
      <TabButton
        active={activeKey === 'foryou'}
        onClick={() => goto('foryou')}
        textClass={textClass(activeKey === 'foryou')}
        indicatorClass={indicatorClass}
      >
        For You
      </TabButton>
      <TabButton
        active={activeKey === 'browse'}
        onClick={() => goto('browse')}
        textClass={textClass(activeKey === 'browse')}
        indicatorClass={indicatorClass}
      >
        Browse All
      </TabButton>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  textClass,
  indicatorClass,
  children,
}: {
  active: boolean;
  onClick: () => void;
  textClass: string;
  indicatorClass: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative py-2 text-base font-semibold cursor-pointer transition-colors ${textClass}`}
    >
      {children}
      <span
        aria-hidden
        className={`absolute left-1/2 -translate-x-1/2 bottom-0 h-0.5 rounded-full transition-all duration-200 ${indicatorClass}`}
        style={{ width: active ? '1.5rem' : '0' }}
      />
    </button>
  );
}
