'use client';

import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { isAuthenticated, loading, googleReady, renderGoogleButton } = useAuth();
  const router = useRouter();
  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/browse');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (googleReady && googleBtnRef.current) {
      renderGoogleButton(googleBtnRef.current);
    }
  }, [googleReady, renderGoogleButton]);

  if (loading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-border border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="bg-surface border border-border rounded-2xl shadow-sm p-10 w-full max-w-sm mx-4">
        <h1 className="text-4xl font-semibold text-center text-foreground tracking-tight mb-1">
          OnlyBae
        </h1>
        <p className="text-center text-muted text-sm mb-10 tracking-wide uppercase">
          Premium Content
        </p>

        <div className="w-full h-px bg-border mb-8" />

        {/* Google Identity Services renders its own button here. We avoid the
            One Tap prompt() flow because FedCM rate-limits silently after the
            user dismisses it once, leaving the click handler doing nothing. */}
        <div ref={googleBtnRef} className="flex justify-center min-h-[44px]">
          {!googleReady && (
            <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
          )}
        </div>
      </div>

      <p className="mt-6 text-muted text-xs">
        Exclusive content awaits
      </p>
    </div>
  );
}
