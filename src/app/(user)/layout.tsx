'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGrip, faUser, faBook, faHeart, faLockOpen, faRightFromBracket, faRightToBracket, faVideo, faBars, faXmark, faBookOpen } from '@fortawesome/free-solid-svg-icons';
import AgeGate from '@/components/AgeGate';
import VersionBadge from '@/components/VersionBadge';
import EdgeSwipeBack, { OPEN_DRAWER_EVENT } from '@/components/EdgeSwipeBack';
import AddToHomeScreenButton from '@/components/AddToHomeScreenButton';

type MenuItem = { key: string; icon: React.ReactNode; label: string; authOnly?: boolean };

const publicMenuItems: MenuItem[] = [
  { key: '/browse', icon: <FontAwesomeIcon icon={faGrip} className="w-4 h-4" />, label: 'Browse' },
  { key: '/reels', icon: <FontAwesomeIcon icon={faVideo} className="w-4 h-4" />, label: 'Reels' },
  { key: '/comics', icon: <FontAwesomeIcon icon={faBookOpen} className="w-4 h-4" />, label: 'Comic' },
  { key: '/series', icon: <FontAwesomeIcon icon={faBook} className="w-4 h-4" />, label: 'Series' },
];

const authMenuItems: MenuItem[] = [
  { key: '/unlocked', icon: <FontAwesomeIcon icon={faLockOpen} className="w-4 h-4" />, label: 'Unlocked', authOnly: true },
  { key: '/favorites', icon: <FontAwesomeIcon icon={faHeart} className="w-4 h-4" />, label: 'Favorites', authOnly: true },
  { key: '/profile', icon: <FontAwesomeIcon icon={faUser} className="w-4 h-4" />, label: 'Me', authOnly: true },
];

// Mobile bottom tab bar — top content entry points plus the user's Me page
// (which holds wallet, transactions, and account settings).
const mobileTabs: MenuItem[] = [
  { key: '/browse', icon: <FontAwesomeIcon icon={faGrip} className="w-5 h-5" />, label: 'Browse' },
  { key: '/reels', icon: <FontAwesomeIcon icon={faVideo} className="w-5 h-5" />, label: 'Reels' },
  { key: '/comics', icon: <FontAwesomeIcon icon={faBookOpen} className="w-5 h-5" />, label: 'Comic' },
  { key: '/favorites', icon: <FontAwesomeIcon icon={faHeart} className="w-5 h-5" />, label: 'Favorites', authOnly: true },
  { key: '/profile', icon: <FontAwesomeIcon icon={faUser} className="w-5 h-5" />, label: 'Me', authOnly: true },
];

const membershipColors: Record<string, string> = {
  free: 'bg-zinc-500/10 text-zinc-400',
  basic: 'bg-cyan-500/10 text-cyan-400',
  premium: 'bg-amber-500/10 text-amber-400',
  vip: 'bg-purple-500/10 text-purple-400',
};

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const menuItems = [...publicMenuItems, ...(isAuthenticated ? authMenuItems : [])];
  const visibleTabs = mobileTabs.filter(t => !t.authOnly || isAuthenticated);

  // Close drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Open the drawer when EdgeSwipeBack emits its "no history, you're at root"
  // event. This gives the left-edge swipe a useful meaning on root pages.
  useEffect(() => {
    const handler = () => setDrawerOpen(true);
    window.addEventListener(OPEN_DRAWER_EVENT, handler);
    return () => window.removeEventListener(OPEN_DRAWER_EVENT, handler);
  }, []);

  const handleNav = (path: string) => {
    router.push(path);
    setDrawerOpen(false);
  };

  const renderNavButton = (item: MenuItem) => (
    <button
      key={item.key}
      onClick={() => handleNav(item.key)}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150 cursor-pointer ${
        pathname === item.key
          ? 'bg-surface-hover text-foreground font-medium border-r-2 border-accent'
          : 'text-muted hover:text-foreground hover:bg-surface-hover'
      }`}
    >
      {item.icon}
      {item.label}
    </button>
  );

  const renderSidebarContent = () => (
    <>
      <div className="h-14 flex items-center justify-center gap-2 border-b border-border">
        <img src="/logo.jpg" alt="OnlyBae" className="w-8 h-8 rounded-full" />
        <span className="text-xl font-semibold text-foreground tracking-tight">OnlyBae</span>
      </div>

      {isAuthenticated && user && (
        <div className="px-4 py-3 border-b border-border">
          <div className="text-foreground text-sm font-medium truncate">{user.name}</div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${membershipColors[user.membershipLevel] || membershipColors.free}`}>
              {user.membershipLevel}
            </span>
            <span className="text-muted text-xs">{user.tokenBalance} tokens</span>
          </div>
        </div>
      )}

      <nav className="flex-1 py-2 overflow-y-auto">
        {menuItems.map(renderNavButton)}
      </nav>

      <div className="border-t border-border py-2">
        {/* Install button is above auth actions so logged-out users see it too.
            Auto-hides when the app is already running in standalone mode. */}
        <AddToHomeScreenButton compact />
        {isAuthenticated ? (
          <button
            onClick={() => { logout(); router.push('/login'); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-colors duration-150 cursor-pointer"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4" />
            Logout
          </button>
        ) : (
          <button
            onClick={() => handleNav('/login')}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-colors duration-150 cursor-pointer"
          >
            <FontAwesomeIcon icon={faRightToBracket} className="w-4 h-4" />
            Login
          </button>
        )}
      </div>

      <div className="border-t border-border px-4 py-3 flex flex-wrap gap-x-3 gap-y-1">
        <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-foreground text-[11px] transition-colors">Terms</a>
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-foreground text-[11px] transition-colors">Privacy</a>
        <a href="/content-removal" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-foreground text-[11px] transition-colors">Content Removal</a>
        <a href="/underage-policy" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-foreground text-[11px] transition-colors">18+</a>
        <a href="/complaints" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-foreground text-[11px] transition-colors">Complaints</a>
      </div>
      <div className="px-4 pb-3">
        <VersionBadge />
      </div>
    </>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-border border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AgeGate />
      <EdgeSwipeBack />

      {/* Desktop sidebar (md+) */}
      <aside className="hidden md:flex w-56 bg-surface border-r border-border flex-col fixed h-full z-30">
        {renderSidebarContent()}
      </aside>

      {/*
        Mobile top bar.
        paddingTop = env(safe-area-inset-top) pushes the content below Dynamic Island / notch.
        height grows to 3.5rem + safe-area so the visible content area is always 3.5rem tall.
      */}
      <header
        className="md:hidden fixed top-0 inset-x-0 z-30 bg-surface/95 backdrop-blur border-b border-border flex items-center px-3 gap-3"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          height: 'calc(3.5rem + env(safe-area-inset-top))',
        }}
      >
        <button
          aria-label="Open menu"
          onClick={() => setDrawerOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface-hover text-foreground cursor-pointer"
        >
          <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <img src="/logo.jpg" alt="OnlyBae" className="w-7 h-7 rounded-full" />
          <span className="text-base font-semibold text-foreground truncate">OnlyBae</span>
        </div>
        {isAuthenticated && user && (
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${membershipColors[user.membershipLevel] || membershipColors.free}`}>
              {user.membershipLevel}
            </span>
            <span className="text-muted text-xs">{user.tokenBalance}</span>
          </div>
        )}
      </header>

      {/* Mobile drawer (slide-in from left).
          Pad by safe-area-inset-top/bottom so the Dynamic Island and home
          indicator do not overlap the logo row or the legal links. */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            className="relative w-64 bg-surface border-r border-border flex flex-col h-full"
            style={{
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            <button
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-hover text-foreground cursor-pointer z-10"
              style={{ top: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
            >
              <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
            </button>
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/*
        Main content. On mobile the top padding clears the fixed header
        (3.5rem) plus the Dynamic Island / notch safe area, and the bottom
        padding clears the tab bar (4rem) plus iOS home indicator.
      */}
      <main className="user-main flex-1 md:ml-56 px-4 md:p-8">
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur border-t border-border flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {visibleTabs.map(tab => {
          const active = pathname === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleNav(tab.key)}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 cursor-pointer transition-colors ${
                active ? 'text-accent' : 'text-muted hover:text-foreground'
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
