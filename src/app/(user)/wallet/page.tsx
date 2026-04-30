'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { userApi } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCoins, faCircleCheck, faCircleXmark, faClock, faArrowRight,
  faCrown, faInfinity, faCalendar,
} from '@fortawesome/free-solid-svg-icons';
import CryptoBuyingGuide from '@/components/CryptoBuyingGuide';

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

interface MembershipPlan {
  key: string;
  label: string;
  priceCents: number;
  durationDays: number | null;
}

const PRESETS = [5, 10, 25, 50, 100, 200];

const STATUS_META: Record<OrderStatus, { icon: typeof faCircleCheck; color: string; bg: string; label: string }> = {
  completed: { icon: faCircleCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Completed' },
  pending:   { icon: faClock,       color: 'text-amber-400',   bg: 'bg-amber-500/10',   label: 'Awaiting payment' },
  failed:    { icon: faCircleXmark, color: 'text-red-400',     bg: 'bg-red-500/10',     label: 'Failed' },
};

// AllScale checkout intents expire ~30 min after creation. Pending orders
// older than this almost certainly mean the user abandoned the checkout —
// display them as expired so they don't look like stuck "processing" charges.
const STALE_PENDING_MS = 30 * 60 * 1000;
function statusMetaFor(o: TopupOrder) {
  if (o.status === 'pending' && Date.now() - new Date(o.createdAt).getTime() > STALE_PENDING_MS) {
    return { icon: faCircleXmark, color: 'text-muted', bg: 'bg-zinc-700/30', label: 'Expired' };
  }
  return STATUS_META[o.status];
}

export default function WalletPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [info, setInfo] = useState<OrdersResponse | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsd, setSelectedUsd] = useState<number>(10);
  const [customUsd, setCustomUsd] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [subscribingPlan, setSubscribingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const returnedOrderId = searchParams.get('order_id');
  // Order we just created locally (when user pays in a new tab and stays on
  // this page). Falls back to the URL-returned id when AllScale redirects
  // the user back here directly.
  const [trackedOrderId, setTrackedOrderId] = useState<string | null>(null);
  const pendingOrderId = trackedOrderId || returnedOrderId;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const [orders, plansRes] = await Promise.all([
        userApi.listTopupOrders(),
        userApi.getMembershipPlans(),
      ]);
      setInfo(orders.data as unknown as OrdersResponse);
      setPlans(plansRes.data.plans);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll the pending order — covers both:
  //   • user paid in a NEW tab and stayed here (trackedOrderId)
  //   • user got redirected back here by AllScale (returnedOrderId from URL)
  // Polls for up to 5 min so on-chain confirms have time to land.
  useEffect(() => {
    if (!pendingOrderId) return;
    let elapsed = 0;
    pollRef.current = setInterval(async () => {
      elapsed += 3;
      try {
        const res = await userApi.getTopupOrder(pendingOrderId);
        if (res.data.status === 'completed') {
          refreshUser();
          load();
          clearInterval(pollRef.current!);
          setTrackedOrderId(null);
          if (returnedOrderId) router.replace('/wallet');
        } else if (res.data.status === 'failed' || elapsed >= 300) {
          load();
          clearInterval(pollRef.current!);
        }
      } catch { /* keep polling */ }
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pendingOrderId, returnedOrderId, refreshUser, load, router]);

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
      // Open AllScale checkout in a new tab so this page keeps polling.
      window.open(res.data.checkoutUrl, '_blank', 'noopener,noreferrer');
      setTrackedOrderId(res.data.orderId);
      load();
    } catch (e) {
      setError((e as Error).message || 'Failed to create checkout');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubscribe = async (plan: 'yearly' | 'lifetime') => {
    setSubscribingPlan(plan);
    setError(null);
    try {
      const res = await userApi.subscribeMembership(plan);
      window.open(res.data.checkoutUrl, '_blank', 'noopener,noreferrer');
      setTrackedOrderId(res.data.orderId);
      load();
    } catch (e) {
      setError((e as Error).message || 'Failed to start subscription');
    } finally {
      setSubscribingPlan(null);
    }
  };

  // VIP status summary
  const vipLevel = (user as { membershipLevel?: string } | undefined)?.membershipLevel;
  const vipExpiresAtRaw = (user as { membershipExpiresAt?: string | null } | undefined)?.membershipExpiresAt;
  const vipExpiresAt = vipExpiresAtRaw ? new Date(vipExpiresAtRaw) : null;
  const vipActive = vipLevel === 'vip' && (!vipExpiresAt || vipExpiresAt > new Date());
  const isLifetime = vipActive && !vipExpiresAt;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  const yearlyPlan = plans.find((p) => p.key === 'yearly');
  const lifetimePlan = plans.find((p) => p.key === 'lifetime');

  return (
    <div className="max-w-xl mx-auto py-6 space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Wallet</h1>

      {/* Balance + VIP */}
      <div className="bg-surface rounded-2xl border border-border p-5 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted">Current Balance</p>
          <p className="text-3xl font-bold text-foreground mt-0.5">
            {(user?.tokenBalance ?? 0).toLocaleString()}
            <span className="text-base font-normal text-muted ml-1.5">tokens</span>
          </p>
          {vipActive && (
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <FontAwesomeIcon icon={faCrown} className="w-3 h-3 text-purple-400" />
              <span className="text-purple-400 font-semibold">
                {isLifetime ? 'Lifetime VIP' : `VIP until ${vipExpiresAt!.toLocaleDateString()}`}
              </span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
          <FontAwesomeIcon icon={faCoins} className="w-5 h-5 text-accent" />
        </div>
      </div>

      {/* Pending payment notice (just-created or returned-from-AllScale) */}
      {pendingOrderId && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-sm text-amber-400 flex items-start gap-2">
          <FontAwesomeIcon icon={faClock} className="w-4 h-4 mt-0.5 animate-pulse shrink-0" />
          <span>
            Confirming your payment on-chain… this page will update automatically once
            the USDT transfer lands (usually under a minute). You can finish paying in
            the other tab — don&apos;t close this one.
          </span>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-xs bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* ── Membership ── */}
      {!isLifetime && (yearlyPlan || lifetimePlan) && (
        <div className="bg-surface rounded-2xl border border-border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faCrown} className="w-4 h-4 text-purple-400" />
            <h2 className="text-base font-semibold text-foreground">VIP Membership</h2>
          </div>
          <p className="text-xs text-muted">Unlock all content — every post, every series, no tokens needed.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {yearlyPlan && (
              <button
                type="button"
                onClick={() => handleSubscribe('yearly')}
                disabled={!!subscribingPlan}
                className="group relative text-left bg-surface-hover hover:bg-surface-hover/70 border border-border hover:border-purple-500/40 rounded-xl p-4 transition-colors cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <FontAwesomeIcon icon={faCalendar} className="w-3 h-3 text-purple-400" />
                  <span className="text-xs font-semibold text-purple-400 uppercase tracking-wide">Yearly</span>
                </div>
                <p className="text-2xl font-bold text-foreground">${(yearlyPlan.priceCents / 100).toFixed(0)}</p>
                <p className="text-xs text-muted mt-0.5">365 days of full access</p>
                <span className="absolute bottom-3 right-3 text-purple-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  {subscribingPlan === 'yearly' ? '…' : '→'}
                </span>
              </button>
            )}
            {lifetimePlan && (
              <button
                type="button"
                onClick={() => handleSubscribe('lifetime')}
                disabled={!!subscribingPlan}
                className="group relative text-left bg-gradient-to-br from-purple-500/10 to-amber-500/10 hover:from-purple-500/20 hover:to-amber-500/20 border border-purple-500/40 rounded-xl p-4 transition-colors cursor-pointer disabled:opacity-50"
              >
                <div className="absolute top-2.5 right-2.5 bg-amber-500 text-black text-[9px] px-1.5 py-0.5 rounded font-bold">
                  BEST VALUE
                </div>
                <div className="flex items-center gap-1.5 mb-2">
                  <FontAwesomeIcon icon={faInfinity} className="w-3 h-3 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Lifetime</span>
                </div>
                <p className="text-2xl font-bold text-foreground">${(lifetimePlan.priceCents / 100).toFixed(0)}</p>
                <p className="text-xs text-muted mt-0.5">Forever VIP · pay once</p>
                <span className="absolute bottom-3 right-3 text-amber-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  {subscribingPlan === 'lifetime' ? '…' : '→'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Token Top-up ── */}
      <div className="bg-surface rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Top Up Tokens</h2>
          <span className="text-xs text-muted">
            <span className="text-accent font-semibold">$1</span> = {tokensPerUsd} tokens
          </span>
        </div>

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

        <div className="bg-surface-hover rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-muted">You will receive</span>
          <span className="text-lg font-bold text-accent">
            {tokensPreview.toLocaleString()}
            <span className="text-sm font-normal text-muted ml-1">tokens</span>
          </span>
        </div>

        <button type="button" onClick={handlePay} disabled={submitting || !amountValid}
          className="w-full h-12 rounded-xl bg-accent text-black font-semibold text-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity">
          {submitting ? 'Opening checkout…' : (
            <>
              Pay ${amountUsd.toFixed(2)} with USDT <FontAwesomeIcon icon={faArrowRight} className="w-3.5 h-3.5" />
            </>
          )}
        </button>
        <p className="text-xs text-muted/70 text-center">
          Secure checkout by AllScale — opens in a new tab.
        </p>
      </div>

      {/* ── How to buy crypto ── */}
      <CryptoBuyingGuide />

      {/* ── Order history ── */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">Recent Orders</h3>
        </div>
        {!info?.items.length ? (
          <div className="px-5 py-10 text-center">
            <p className="text-muted text-sm">No orders yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {info.items.map((o) => {
              const meta = statusMetaFor(o);
              return (
                <div key={o.id} className="px-5 py-3 flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${meta.bg}`}>
                    <FontAwesomeIcon icon={meta.icon} className={`w-3.5 h-3.5 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">
                        {o.tokensAwarded > 0
                          ? `${o.status === 'completed' ? '+' : ''}${o.tokensAwarded.toLocaleString()} tokens`
                          : 'VIP Membership'}
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
