'use client';

import { useState } from 'react';

// Tiny build-version label for the sidebar footer.
// Baked in at build time via next.config.ts env.NEXT_PUBLIC_APP_VERSION.
// Click to copy — makes it easy for users to include in bug reports.
export default function VersionBadge({ className = '' }: { className?: string }) {
  const version = process.env.NEXT_PUBLIC_APP_VERSION;
  const [copied, setCopied] = useState(false);

  if (!version) return null;

  const handleCopy = async () => {
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(version);
        ok = true;
      } else {
        // Fallback for browsers that block the Clipboard API (Firefox private mode,
        // older Safari, non-HTTPS contexts). A temporary textarea + execCommand still works.
        const el = document.createElement('textarea');
        el.value = version;
        el.setAttribute('readonly', '');
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        try { ok = document.execCommand('copy'); } catch { ok = false; }
        document.body.removeChild(el);
      }
    } catch { /* ignore */ }
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`App version ${version}. Click to copy.`}
      title={copied ? 'Copied!' : 'Click to copy'}
      className={`text-muted hover:text-foreground text-[10px] font-mono tracking-tight transition-colors cursor-pointer ${className}`}
    >
      {copied ? 'copied!' : `v${version}`}
    </button>
  );
}
