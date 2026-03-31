'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGrip, faUser, faWallet, faBook, faHeart, faLockOpen, faRightFromBracket, faRightToBracket } from '@fortawesome/free-solid-svg-icons';
import AgeGate from '@/components/AgeGate';

const publicMenuItems = [
  { key: '/browse', icon: <FontAwesomeIcon icon={faGrip} className="w-4 h-4" />, label: 'Browse' },
  { key: '/series', icon: <FontAwesomeIcon icon={faBook} className="w-4 h-4" />, label: 'Series' },
];

const authMenuItems = [
  { key: '/unlocked', icon: <FontAwesomeIcon icon={faLockOpen} className="w-4 h-4" />, label: 'Unlocked' },
  { key: '/favorites', icon: <FontAwesomeIcon icon={faHeart} className="w-4 h-4" />, label: 'Favorites' },
  { key: '/wallet', icon: <FontAwesomeIcon icon={faWallet} className="w-4 h-4" />, label: 'Wallet' },
  { key: '/profile', icon: <FontAwesomeIcon icon={faUser} className="w-4 h-4" />, label: 'Profile' },
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

  const menuItems = [...publicMenuItems, ...(isAuthenticated ? authMenuItems : [])];

  const renderNavButton = (item: { key: string; icon: React.ReactNode; label: string }) => (
    <button
      key={item.key}
      onClick={() => router.push(item.key)}
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-border border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <AgeGate />
      {/* Sidebar */}
      <aside className="w-56 bg-surface border-r border-border flex flex-col fixed h-full">
        <div className="h-14 flex items-center justify-center gap-2 border-b border-border">
          <img src="/logo.jpg" alt="OnlyBae" className="w-8 h-8 rounded-full" />
          <span className="text-xl font-semibold text-foreground tracking-tight">
            OnlyBae
          </span>
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

        <nav className="flex-1 py-2">
          {menuItems.map(renderNavButton)}
        </nav>

        <div className="border-t border-border py-2">
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
              onClick={() => router.push('/login')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-colors duration-150 cursor-pointer"
            >
              <FontAwesomeIcon icon={faRightToBracket} className="w-4 h-4" />
              Login
            </button>
          )}
        </div>

        <div className="border-t border-border px-4 py-3 flex flex-wrap gap-x-3 gap-y-1">
          <a href="/terms" className="text-muted hover:text-foreground text-[11px] transition-colors">Terms</a>
          <a href="/privacy" className="text-muted hover:text-foreground text-[11px] transition-colors">Privacy</a>
          <a href="/content-removal" className="text-muted hover:text-foreground text-[11px] transition-colors">DMCA</a>
          <a href="/underage-policy" className="text-muted hover:text-foreground text-[11px] transition-colors">18+</a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-56 p-8">
        {children}
      </main>
    </div>
  );
}
