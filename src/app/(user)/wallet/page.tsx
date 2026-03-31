'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { userApi } from '@/utils/api';
import ProtectedRoute from '@/components/ProtectedRoute';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

// TODO: These are placeholder amounts - finalize pricing later
const topUpOptions = [
  { tokens: 50, price: '$4.99' },
  { tokens: 100, price: '$8.99' },
  { tokens: 250, price: '$19.99' },
  { tokens: 500, price: '$34.99' },
];

export default function WalletPage() {
  const { user } = useAuth();
  const [customAmount, setCustomAmount] = useState<number>(10);
  const [balance, setBalance] = useState<number>(user?.tokenBalance || 0);
  const [membership, setMembership] = useState<string>(user?.membershipLevel || 'free');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTopUp = async (amount: number) => {
    setMessage(null);
    try {
      const res = await userApi.topUp(amount);
      const data = res.data as { newBalance: number };
      setBalance(data.newBalance);
      setMessage({ type: 'success', text: `Top-up successful! +${amount} tokens` });
      fetchData();
    } catch (err: unknown) {
      const error = err as Error;
      setMessage({ type: 'error', text: error.message || 'Top-up failed' });
    }
  };

  if (!user) return <ProtectedRoute><div /></ProtectedRoute>;

  return (
    <div>
      <h1 className="text-3xl font-semibold text-foreground tracking-tight mb-8">
        Wallet
      </h1>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 max-w-lg">
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-muted text-xs uppercase tracking-wider mb-1">Token Balance</p>
              <p className="text-3xl font-semibold text-foreground">{balance}</p>
              <p className="text-muted text-xs mt-0.5">tokens</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-muted text-xs uppercase tracking-wider mb-1">Membership</p>
              <p className="text-3xl font-semibold text-foreground">{membership.toUpperCase()}</p>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 rounded-lg px-4 py-3 border ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          {/* Top Up */}
          <div className="bg-surface border border-border rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">Top Up Tokens</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {topUpOptions.map((opt) => (
                <button
                  key={opt.tokens}
                  onClick={() => handleTopUp(opt.tokens)}
                  className="flex flex-col items-center gap-1 p-4 rounded-xl border border-border bg-background hover:border-accent hover:shadow-sm transition-all duration-200 cursor-pointer group"
                >
                  <span className="text-2xl font-semibold text-foreground group-hover:text-accent transition-colors">{opt.tokens}</span>
                  <span className="text-xs text-muted">tokens</span>
                  <span className="text-sm font-medium text-foreground mt-1">{opt.price}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <span className="text-sm text-muted">Custom:</span>
              <input
                type="number"
                min={1}
                value={customAmount}
                onChange={(e) => setCustomAmount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 h-10 px-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
              <button
                onClick={() => handleTopUp(customAmount)}
                className="h-10 px-5 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors cursor-pointer"
              >
                Top Up
              </button>
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Transaction History</h2>
            </div>
            {transactions.length === 0 ? (
              <div className="px-6 py-12 text-center text-muted text-sm">No transactions yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-background">
                      <th className="text-left px-6 py-3 text-muted text-xs uppercase tracking-wider font-medium">Type</th>
                      <th className="text-left px-6 py-3 text-muted text-xs uppercase tracking-wider font-medium">Amount</th>
                      <th className="text-left px-6 py-3 text-muted text-xs uppercase tracking-wider font-medium">Description</th>
                      <th className="text-left px-6 py-3 text-muted text-xs uppercase tracking-wider font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
                        <td className="px-6 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            tx.type === 'topup'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}>
                            {tx.type === 'topup' ? 'Top-up' : 'Spend'}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={tx.amount > 0 ? 'text-emerald-400 font-medium' : 'text-red-500 font-medium'}>
                            {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-muted">{tx.description}</td>
                        <td className="px-6 py-3 text-muted">{new Date(tx.createdAt).toLocaleString()}</td>
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
