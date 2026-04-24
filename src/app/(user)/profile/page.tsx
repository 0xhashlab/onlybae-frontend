'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { userApi } from '@/utils/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AddToHomeScreenButton from '@/components/AddToHomeScreenButton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet, faArrowRight } from '@fortawesome/free-solid-svg-icons';

const membershipStyles: Record<string, string> = {
  free: 'bg-zinc-500/10 text-zinc-400',
  basic: 'bg-cyan-500/10 text-cyan-400',
  premium: 'bg-amber-500/10 text-amber-400',
  vip: 'bg-purple-500/10 text-purple-400',
};

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  // Editable account fields
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Wallet state — balance + recent transactions (top-up happens on /wallet)
  const [balance, setBalance] = useState<number>(user?.tokenBalance || 0);
  const [membership, setMembership] = useState<string>(user?.membershipLevel || 'free');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletLoading, setWalletLoading] = useState(true);

  const fetchWallet = useCallback(async () => {
    setWalletLoading(true);
    try {
      const balRes = await userApi.getBalance();
      const balData = balRes.data as { tokenBalance: number; membershipLevel: string };
      setBalance(balData.tokenBalance);
      setMembership(balData.membershipLevel);

      const txRes = await userApi.getTransactions({ limit: 50 });
      const txData = txRes.data as { items: Transaction[] };
      setTransactions(txData.items || []);
    } catch {
      // keep existing values
    } finally {
      setWalletLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchWallet();
  }, [user, fetchWallet]);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setProfileError('Name is required');
      return;
    }
    setSaving(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      await userApi.updateProfile({ name: name.trim() });
      setProfileSuccess('Profile updated successfully');
      setEditing(false);
      refreshUser?.();
    } catch {
      setProfileError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <ProtectedRoute><div /></ProtectedRoute>;

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight mb-6 md:mb-8">
        Me
      </h1>

      {/* Account card */}
      <div className="bg-surface border border-border rounded-xl max-w-xl mb-6">
        <div className="p-6 flex items-center gap-5 border-b border-border">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-surface-hover border-2 border-border flex items-center justify-center">
              <span className="text-2xl text-muted">{user.name.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div className="flex-1">
            {editing ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            ) : (
              <h2 className="text-xl font-semibold text-foreground">{user.name}</h2>
            )}
            <p className="text-muted text-sm mt-0.5">{user.email}</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-border/50">
            <span className="text-sm text-muted">Membership</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${membershipStyles[membership] || membershipStyles.free}`}>
              {membership.toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-border/50">
            <span className="text-sm text-muted">Token Balance</span>
            <span className="text-sm font-medium text-foreground">{balance} tokens</span>
          </div>

          {profileError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
              <p className="text-red-400 text-sm">{profileError}</p>
            </div>
          )}
          {profileSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2">
              <p className="text-emerald-400 text-sm">{profileSuccess}</p>
            </div>
          )}

          {editing ? (
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="h-10 px-5 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => { setEditing(false); setName(user.name); setProfileError(''); }}
                className="h-10 px-5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground text-sm font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="pt-2">
              <button
                onClick={() => { setEditing(true); setProfileSuccess(''); }}
                className="h-10 px-5 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors cursor-pointer"
              >
                Edit Profile
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Install as an app */}
      <div className="bg-surface border border-border rounded-xl max-w-xl mb-6 p-4 md:p-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Install as an app</p>
          <p className="text-xs text-muted mt-0.5 leading-relaxed">
            Add OnlyBae to your home screen for a full-screen experience, quicker launch, and no browser bars.
          </p>
        </div>
        <AddToHomeScreenButton />
      </div>

      {/* Wallet section */}
      <h2 className="text-lg md:text-xl font-semibold text-foreground tracking-tight mb-4">Wallet</h2>

      {walletLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Top Up entry — actual payment flow lives on /wallet */}
          <button
            onClick={() => router.push('/wallet')}
            className="w-full bg-surface border border-border rounded-xl p-4 md:p-5 mb-6 flex items-center justify-between hover:border-accent transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-accent/10 flex items-center justify-center">
                <FontAwesomeIcon icon={faWallet} className="w-5 h-5 text-accent" />
              </div>
              <div className="text-left">
                <p className="text-base font-semibold text-foreground group-hover:text-accent transition-colors">Top Up Tokens</p>
                <p className="text-xs text-muted mt-0.5">Pay with USDT via AllScale</p>
              </div>
            </div>
            <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 text-muted group-hover:text-accent transition-colors" />
          </button>

          {/* Transaction History */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">Transaction History</h3>
            </div>
            {transactions.length === 0 ? (
              <div className="px-6 py-12 text-center text-muted text-sm">No transactions yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-background">
                      <th className="text-left px-4 md:px-6 py-3 text-muted text-xs uppercase tracking-wider font-medium">Type</th>
                      <th className="text-left px-4 md:px-6 py-3 text-muted text-xs uppercase tracking-wider font-medium">Amount</th>
                      <th className="text-left px-4 md:px-6 py-3 text-muted text-xs uppercase tracking-wider font-medium">Description</th>
                      <th className="text-left px-4 md:px-6 py-3 text-muted text-xs uppercase tracking-wider font-medium hidden sm:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
                        <td className="px-4 md:px-6 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            tx.type === 'topup'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}>
                            {tx.type === 'topup' ? 'Top-up' : 'Spend'}
                          </span>
                        </td>
                        <td className="px-4 md:px-6 py-3">
                          <span className={tx.amount > 0 ? 'text-emerald-400 font-medium' : 'text-red-500 font-medium'}>
                            {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                          </span>
                        </td>
                        <td className="px-4 md:px-6 py-3 text-muted">{tx.description}</td>
                        <td className="px-4 md:px-6 py-3 text-muted hidden sm:table-cell">{new Date(tx.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
