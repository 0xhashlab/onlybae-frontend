'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { userApi } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCoins, faCircleCheck, faCircleXmark, faClock, faArrowRight,
} from '@fortawesome/free-solid-svg-icons';

type OrderStatus = 'pending' | 'completed' | 'failed';

interface TopupOrder {
  id: string;
  amountCents: number;
  amountCoins: string | null;
  tokensAwarded: number;
  coinSymbol: string | null;
  chainId: string | null;
  txHash: string | null;
  status: OrderStatus;
  createdAt: string;
}

interface OrdersResponse {
  items: TopupOrder[];
  tokensPerUsd: number;
  minDepositUsd: number;
  stableCoin: string;
}

const PRESETS = [5, 10, 25, 50, 100, 200];

const STATUS_META: Record<OrderStatus, { icon: typeof faCircleCheck; color: string; bg: string; label: string }> = {
  completed: { icon: faCircleCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Completed' },
  pending:   { icon: faClock,       color: 'text-amber-400',   bg: 'bg-amber-500/10',   label: 'Processing' },
  failed:    { icon: faCircleXmark, color: 'text-red-400',     bg: 'bg-red-500/10',     label: 'Failed' },
};

export default function WalletPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [info, setInfo] = useState<OrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUsd, setSelectedUsd] = useState<number>(10);
  const [customUsd, setCustomUsd] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const returnedOrderId = searchParams.get('order_id');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await userApi.listTopupOrders();
      setInfo(res.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // If user returned from AllScale with ?order_id=..., poll the order until
  // completed or 60 seconds elapse.
  useEffect(() => {
    if (!returnedOrderId) return;
    let elapsed = 0;
    pollRef.current = setInterval(async () => {
      elapsed += 3;
      try {
        const res = await userApi.getTopupOrder(returnedOrderId);
        if (res.data.status === 'completed') {
          refreshUser();
          load();
          clearInterval(pollRef.current!);
          // Clean the query string so refresh doesn't re-poll
          router.replace('/wallet');
        } else if (res.data.status === 'failed' || elapsed >= 60) {
          load();
          clearInterval(pollRef.current!);
        }
      } catch { /* keep polling */ }
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [returnedOrderId, refreshUser, load, router]);

  const amountUsd = customUsd ? parseFloat(customUsd) : selectedUsd;
  const minUsd = info?.minDepositUsd ?? 1;
  const tokensPerUsd = info?.tokensPerUsd ?? 100;
  const tokensPreview = Math.floor((amountUsd || 0) * tokensPerUsd);
  const amountValid = !isNaN(amountUsd) && amountUsd >= minUsd;

  const handlePay = async () => {
    if (!amountValid) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await userApi.createTopup(amountUsd);
      window.location.href = res.data.checkoutUrl;
    } catch (e) {
      setError((e as Error).message || 'Failed to create checkout');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-6 space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Top Up Tokens</h1>

      {/* Balance */}
      <div className="bg-surface rounded-2xl border border-border p-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">Current Balance</p>
          <p className="text-3xl font-bold text-foreground mt-0.5">
            {(user?.tokenBalance ?? 0).toLocaleString()}
            <span className="text-base font-normal text-muted ml-1.5">tokens</span>
          </p>
        </div>
        <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
          <FontAwesomeIcon icon={faCoins} className="w-5 h-5 text-accent" />
        </div>
      </div>

      {/* Returned from AllScale notice */}
      {returnedOrderId && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-sm text-amber-400 flex items-center gap-2">
          <FontAwesomeIcon icon={faClock} className="w-4 h-4 animate-pulse" />
          Confirming your payment on-chain… tokens will arrive within a minute.
        </div>
      )}

      {/* Rate */}
      <div className="bg-accent/5 border border-accent/20 rounded-xl px-4 py-3 text-sm">
        <span className="font-semibold text-accent">$1.00 USDT</span>
        {' = '}
        <span className="font-semibold text-foreground">{tokensPerUsd} tokens</span>
        <span className="text-muted ml-2">· Min. ${minUsd.toFixed(2)}</span>
      </div>

      {/* Amount selection */}
      <div className="bg-surface rounded-2xl border border-border p-5 space-y-4">
        <div>
          <p className="text-xs text-muted uppercase tracking-wide font-semibold mb-2">Choose amount</p>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((amt) => (
              <button key={amt} type="button"
                onClick={() => { setSelectedUsd(amt); setCustomUsd(''); }}
                className={`py-3 rounded-lg text-sm font-semibold border transition-colors cursor-pointer ${
                  !customUsd && selectedUsd === amt
                    ? 'bg-accent text-black border-accent'
                    : 'bg-transparent text-foreground border-border hover:border-foreground/30'
                }`}>
                ${amt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-muted uppercase tracking-wide font-semibold mb-2">Or custom amount (USD)</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={customUsd}
              onChange={(e) => setCustomUsd(e.target.value)}
              placeholder={String(selectedUsd)}
              min={minUsd}
              step="0.01"
              className="w-full pl-7 pr-3 py-2.5 rounded-lg bg-surface-hover border border-border text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="bg-surface-hover rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-muted">You will receive</span>
          <span className="text-lg font-bold text-accent">
            {tokensPreview.toLocaleString()}
            <span className="text-sm font-normal text-muted ml-1">tokens</span>
          </span>
        </div>

        {error && (
          <p className="text-red-400 text-xs bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button type="button" onClick={handlePay} disabled={submitting || !amountValid}
          className="w-full h-12 rounded-xl bg-accent text-black font-semibold text-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity">
          {submitting ? 'Redirecting to checkout…' : (
            <>
              Pay ${amountUsd.toFixed(2)} with USDT <FontAwesomeIcon icon={faArrowRight} className="w-3.5 h-3.5" />
            </>
          )}
        </button>
        <p className="text-xs text-muted/70 text-center">
          Secure checkout by AllScale — pay with any crypto wallet (MetaMask, Trust Wallet, etc.)
        </p>
      </div>

      {/* Order history */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">Recent Top-Ups</h3>
        </div>
        {!info?.items.length ? (
          <div className="px-5 py-10 text-center">
            <p className="text-muted text-sm">No top-ups yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {info.items.map((o) => {
              const meta = STATUS_META[o.status];
              return (
                <div key={o.id} className="px-5 py-3 flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${meta.bg}`}>
                    <FontAwesomeIcon icon={meta.icon} className={`w-3.5 h-3.5 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">
                        {o.status === 'completed' ? '+' : ''}{o.tokensAwarded.toLocaleString()} tokens
                      </span>
                      <span className="text-xs text-muted">
                        ${(o.amountCents / 100).toFixed(2)} {o.coinSymbol || 'USDT'}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${meta.bg} ${meta.color}`}>{meta.label}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted">
                        {new Date(o.createdAt).toLocaleDateString()}{' '}
                        {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {o.txHash && (
                        <a
                          href={o.chainId === '56' ? `https://bscscan.com/tx/${o.txHash}`
                            : o.chainId === '8453' ? `https://basescan.org/tx/${o.txHash}`
                            : `https://etherscan.io/tx/${o.txHash}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-accent hover:underline">View ↗</a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
