'use client';

import { useState } from 'react';
import { CRYPTO_REGIONS, CRYPTO_GUIDE_INTRO } from '@/lib/cryptoBuyingGuide';

export default function CryptoBuyingGuide() {
  const [activeRegion, setActiveRegion] = useState<string>(CRYPTO_REGIONS[0].code);
  const region = CRYPTO_REGIONS.find((r) => r.code === activeRegion) || CRYPTO_REGIONS[0];

  return (
    <div className="bg-surface rounded-2xl border border-border p-5 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">{CRYPTO_GUIDE_INTRO.title}</h3>
        <p className="text-xs text-muted mt-1.5 leading-relaxed">{CRYPTO_GUIDE_INTRO.body}</p>
      </div>

      {/* Region tabs */}
      <div className="flex flex-wrap gap-1.5">
        {CRYPTO_REGIONS.map((r) => (
          <button
            key={r.code}
            type="button"
            onClick={() => setActiveRegion(r.code)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              activeRegion === r.code
                ? 'bg-accent text-black'
                : 'bg-surface-hover text-foreground hover:bg-surface-hover/70'
            }`}
          >
            <span className="mr-1">{r.flag}</span>
            {r.label}
          </button>
        ))}
      </div>

      {/* Region content */}
      <div>
        <p className="text-xs text-muted mb-2.5">{region.countries}</p>
        <div className="space-y-2">
          {region.exchanges.map((ex) => (
            <a
              key={ex.name}
              href={ex.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-surface-hover hover:bg-surface-hover/70 border border-border hover:border-foreground/30 rounded-lg px-3.5 py-2.5 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-foreground">{ex.name}</span>
                    <span className="text-muted text-xs">↗</span>
                  </div>
                  {ex.note && <p className="text-[11px] text-muted mt-0.5">{ex.note}</p>}
                </div>
                <div className="flex flex-wrap gap-1 justify-end shrink-0 max-w-[60%]">
                  {ex.methods.map((m) => (
                    <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-muted">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-muted leading-relaxed pt-1 border-t border-border">
        After buying USDT, withdraw it to your wallet. On the AllScale checkout page you&apos;ll be shown
        an address to send USDT to — once it confirms on-chain, your tokens / membership are credited
        automatically.
      </p>
    </div>
  );
}
