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
    try {
      await navigator.clipboard.writeText(version);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard API unavailable — silently ignore */
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
      {copied ? 'copied!' : `v ${version}`}
    </button>
  );
}
