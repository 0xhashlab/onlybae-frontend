'use client';

import { useState, useEffect, useCallback } from 'react';
import QRCode from 'react-qr-code';
import { userApi } from '@/utils/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCoins, faCopy, faCheck, faArrowsRotate, faChevronDown, faChevronUp,
  faCircleCheck, faCircleXmark, faClock, faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { faEthereum } from '@fortawesome/free-brands-svg-icons';

// ─── Guided purchasing by region ────────────────────────────────────────────

const REGION_GUIDES: Record<string, { name: string; desc: string; url: string }[]> = {
  Global: [
    { name: 'Binance', desc: 'Buy USDC/USDT, withdraw to your deposit address.', url: 'https://www.binance.com' },
    { name: 'OKX', desc: 'Buy USDC/USDT with card or bank transfer, then withdraw.', url: 'https://www.okx.com' },
    { name: 'Bybit', desc: 'P2P or card purchase, then transfer USDC/USDT.', url: 'https://www.bybit.com' },
  ],
  US: [
    { name: 'Coinbase', desc: 'Buy USDC with zero fees on Coinbase, send via Base for lowest cost.', url: 'https://www.coinbase.com' },
    { name: 'Kraken', desc: 'Buy USDT/USDC, withdraw to your deposit address.', url: 'https://www.kraken.com' },
    { name: 'Cash App', desc: 'Buy Bitcoin on Cash App, then swap to USDC on a DEX.', url: 'https://cash.app' },
  ],
  Europe: [
    { name: 'Kraken', desc: 'SEPA bank transfer → buy USDC → withdraw to Base.', url: 'https://www.kraken.com' },
    { name: 'Bitstamp', desc: 'EU-regulated, buy USDC/USDT via bank wire.', url: 'https://www.bitstamp.net' },
    { name: 'Revolut', desc: 'Buy crypto in-app, withdraw USDC to your deposit address.', url: 'https://www.revolut.com' },
  ],
  Asia: [
    { name: 'Binance', desc: 'Largest exchange in Asia — buy USDT with local payment methods.', url: 'https://www.binance.com' },
    { name: 'OKX', desc: 'P2P market with CNY, HKD, KRW and more.', url: 'https://www.okx.com' },
    { name: 'Bybit', desc: 'Wide P2P support across Southeast Asia.', url: 'https://www.bybit.com' },
  ],
  Other: [
    { name: 'Binance P2P', desc: 'Over 100 fiat currencies via peer-to-peer trading.', url: 'https://p2p.binance.com' },
    { name: 'LocalCryptos', desc: 'Non-custodial P2P marketplace, almost any country.', url: 'https://localcryptos.com' },
    { name: 'MoonPay', desc: 'Card-to-crypto widget available in many countries.', url: 'https://www.moonpay.com' },
  ],
};

const REGIONS = Object.keys(REGION_GUIDES);

type WalletInfo = Awaited<ReturnType<typeof userApi.getWalletInfo>>['data'];

export default function WalletPage() {
  const [info, setInfo] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedToken, setSelectedToken] = useState<'USDC' | 'USDT'>('USDC');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('base');

  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{ newCount: number; newBalance: number } | null>(null);

  const [guideOpen, setGuideOpen] = useState(false);
  const [region, setRegion] = useState('Global');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await userApi.getWalletInfo();
      setInfo(res.data);
      // Default to the recommended network
      const rec = res.data.networks.find(n => n.recommended);
      if (rec) setSelectedNetwork(rec.key);
    } catch (e) {
      setError((e as Error).message || 'Failed to load wallet info');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCopy = async () => {
    const addr = info?.depositAddressEvm;
    if (!addr) return;
    try {
      await navigator.clipboard.writeText(addr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handleCheck = async () => {
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await userApi.checkDeposits();
      setCheckResult({
        newCount: (res.data.newDeposits as unknown[]).length,
        newBalance: res.data.newBalance,
      });
      // Refresh wallet info to show new deposits
      await load();
    } catch (e) {
      setCheckResult({ newCount: -1, newBalance: 0 });
    } finally {
      setChecking(false);
    }
  };

  const address = info?.depositAddressEvm ?? '';
  const shortAddr = address ? `${address.slice(0, 8)}...${address.slice(-6)}` : '';

  const networkInfo = info?.networks.find(n => n.key === selectedNetwork);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <p className="text-red-400 text-sm">{error}</p>
        <button onClick={load} className="mt-4 text-accent text-sm cursor-pointer">Retry</button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-6 px-0 md:px-4 space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Top Up Tokens</h1>

      {/* Balance card */}
      <div className="bg-surface rounded-2xl border border-border p-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">Current Balance</p>
          <p className="text-3xl font-bold text-foreground mt-0.5">
            {(info?.tokenBalance ?? 0).toLocaleString()}
            <span className="text-base font-normal text-muted ml-1.5">tokens</span>
          </p>
        </div>
        <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
          <FontAwesomeIcon icon={faCoins} className="w-5 h-5 text-accent" />
        </div>
      </div>

      {/* Conversion rate info */}
      <div className="bg-accent/5 border border-accent/20 rounded-xl px-4 py-3 text-sm text-foreground/80">
        <span className="font-semibold text-accent">1 USD</span>
        {' = '}
        <span className="font-semibold text-foreground">{info?.tokensPerUsd ?? 100} tokens</span>
        <span className="text-muted ml-2">· Minimum deposit: ${info?.minDepositUsd?.toFixed(2) ?? '1.00'} USD</span>
      </div>

      {/* Deposit section */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        {/* Token selector */}
        <div className="px-5 pt-5 pb-3">
          <p className="text-xs text-muted uppercase tracking-wide font-semibold mb-2">Select Token</p>
          <div className="flex gap-2">
            {(['USDC', 'USDT'] as const).map(tok => (
              <button
                key={tok}
                onClick={() => setSelectedToken(tok)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors cursor-pointer ${
                  selectedToken === tok
                    ? 'bg-accent text-black border-accent'
                    : 'bg-transparent text-muted border-border hover:border-foreground/30'
                }`}
              >
                {tok}
              </button>
            ))}
          </div>
        </div>

        {/* Network selector */}
        <div className="px-5 pb-4">
          <p className="text-xs text-muted uppercase tracking-wide font-semibold mb-2">Select Network</p>
          <div className="flex gap-2 flex-wrap">
            {(info?.networks ?? [])
              .filter(n => n.tokens.includes(selectedToken))
              .map(n => (
                <button
                  key={n.key}
                  onClick={() => setSelectedNetwork(n.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                    selectedNetwork === n.key
                      ? 'bg-surface-hover text-foreground border-accent'
                      : 'bg-transparent text-muted border-border hover:border-foreground/30'
                  }`}
                >
                  <FontAwesomeIcon icon={faEthereum} className="w-3.5 h-3.5" />
                  {n.name}
                  {n.recommended && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent font-bold">
                      CHEAP
                    </span>
                  )}
                </button>
              ))}
          </div>
        </div>

        <div className="border-t border-border" />

        {/* QR + address */}
        <div className="p-5 flex flex-col sm:flex-row gap-6 items-center">
          {address ? (
            <div className="p-3 bg-white rounded-xl shrink-0">
              <QRCode value={address} size={140} />
            </div>
          ) : (
            <div className="w-[166px] h-[166px] rounded-xl bg-surface-hover animate-pulse" />
          )}

          <div className="flex-1 min-w-0 w-full">
            <p className="text-xs text-muted uppercase tracking-wide font-semibold mb-2">
              Your {selectedToken} Deposit Address
            </p>

            {/* Address display + copy */}
            <div className="flex items-center gap-2 bg-surface-hover rounded-lg px-3 py-2.5 mb-3">
              <code className="text-xs text-foreground flex-1 min-w-0 truncate">{address}</code>
              <button
                onClick={handleCopy}
                aria-label="Copy address"
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md hover:bg-border transition-colors cursor-pointer"
              >
                <FontAwesomeIcon
                  icon={copied ? faCheck : faCopy}
                  className={`w-3.5 h-3.5 ${copied ? 'text-emerald-400' : 'text-muted'}`}
                />
              </button>
            </div>

            <div className="space-y-1.5 text-xs text-muted">
              <p className="flex items-start gap-1.5">
                <FontAwesomeIcon icon={faTriangleExclamation} className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                Only send <strong className="text-foreground">{selectedToken}</strong> on{' '}
                <strong className="text-foreground">{networkInfo?.name ?? selectedNetwork}</strong>.
                Sending other tokens will result in permanent loss.
              </p>
              <p>⚡ Deposits on Base usually appear within 1–2 minutes.</p>
              <p>📌 This address is permanent — reuse it anytime.</p>
            </div>
          </div>
        </div>
      </div>

      {/* New to crypto? */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <button
          onClick={() => setGuideOpen(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-surface-hover transition-colors"
        >
          <span className="font-semibold text-foreground text-sm">New to crypto?</span>
          <FontAwesomeIcon icon={guideOpen ? faChevronUp : faChevronDown} className="w-4 h-4 text-muted" />
        </button>

        {guideOpen && (
          <div className="border-t border-border px-5 pb-5">
            <p className="text-sm text-muted mt-4 mb-3">
              You need a crypto wallet to receive {selectedToken}. Choose your region for the
              easiest way to buy and send it.
            </p>

            {/* Region tabs */}
            <div className="flex gap-2 flex-wrap mb-4">
              {REGIONS.map(r => (
                <button
                  key={r}
                  onClick={() => setRegion(r)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors ${
                    region === r
                      ? 'bg-accent text-black border-accent'
                      : 'text-muted border-border hover:text-foreground'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {REGION_GUIDES[region].map(guide => (
                <a
                  key={guide.name}
                  href={guide.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-hover hover:bg-border transition-colors cursor-pointer group"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                      {guide.name}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{guide.desc}</p>
                  </div>
                  <span className="text-xs text-muted group-hover:text-accent transition-colors ml-4 shrink-0">
                    Visit ↗
                  </span>
                </a>
              ))}
            </div>

            <p className="text-xs text-muted mt-3 leading-relaxed">
              <strong className="text-foreground">Tip:</strong> For lowest fees, send {selectedToken} on{' '}
              <strong className="text-foreground">Base network</strong> via Coinbase. Ethereum network
              transactions may cost $2–10 in gas fees.
            </p>
          </div>
        )}
      </div>

      {/* Recent Deposits */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-sm">Recent Deposits</span>
            {/* Live indicator */}
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>
          <button
            onClick={handleCheck}
            disabled={checking}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground cursor-pointer disabled:opacity-50 transition-colors"
          >
            <FontAwesomeIcon icon={faArrowsRotate} className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking…' : 'Check Now'}
          </button>
        </div>

        {checkResult && (
          <div className={`px-5 py-2.5 text-xs border-b border-border ${
            checkResult.newCount < 0
              ? 'text-red-400 bg-red-500/5'
              : checkResult.newCount === 0
                ? 'text-muted bg-transparent'
                : 'text-emerald-400 bg-emerald-500/5'
          }`}>
            {checkResult.newCount < 0
              ? 'Check failed. Please try again.'
              : checkResult.newCount === 0
                ? 'No new deposits found.'
                : `✓ ${checkResult.newCount} new deposit${checkResult.newCount > 1 ? 's' : ''} credited! New balance: ${checkResult.newBalance.toLocaleString()} tokens`}
          </div>
        )}

        {!info?.recentDeposits || info.recentDeposits.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-muted text-sm">No deposits yet.</p>
            <p className="text-muted/60 text-xs mt-1">
              Send {selectedToken} to your address above and click "Check Now".
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {info.recentDeposits.map(d => (
              <div key={d.id} className="px-5 py-3 flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  d.status === 'confirmed' ? 'bg-emerald-500/10' : d.status === 'failed' ? 'bg-red-500/10' : 'bg-amber-500/10'
                }`}>
                  <FontAwesomeIcon
                    icon={d.status === 'confirmed' ? faCircleCheck : d.status === 'failed' ? faCircleXmark : faClock}
                    className={`w-3.5 h-3.5 ${
                      d.status === 'confirmed' ? 'text-emerald-400' : d.status === 'failed' ? 'text-red-400' : 'text-amber-400'
                    }`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      +{d.tokensAwarded.toLocaleString()} tokens
                    </span>
                    <span className="text-xs text-muted">
                      {parseFloat(d.amountUsd).toFixed(2)} {d.token}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-hover text-muted capitalize">
                      {d.network}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted">
                      {new Date(d.createdAt).toLocaleDateString()} {new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <a
                      href={`https://${d.network === 'base' ? 'basescan.org' : 'etherscan.io'}/tx/${d.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-accent hover:underline"
                    >
                      View tx ↗
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted/60 text-center pb-4">
        Deposits are processed automatically. If a deposit is not reflected after 5 minutes,
        click "Check Now" or contact support.
      </p>
    </div>
  );
}
