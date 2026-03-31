'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'onlybae:age-verified';
const GEO_BLOCKED_KEY = 'onlybae:geo-blocked';

export default function AgeGate() {
  const [verified, setVerified] = useState<boolean | null>(null);
  const [geoBlocked, setGeoBlocked] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setVerified(stored === 'true');
    } catch {
      setVerified(false);
    }

    // Check geo block (cached in sessionStorage to avoid repeated API calls)
    try {
      const cached = sessionStorage.getItem(GEO_BLOCKED_KEY);
      if (cached !== null) {
        setGeoBlocked(cached === 'true');
        return;
      }
    } catch { /* ignore */ }

    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        const blocked = data.country_code === 'CN';
        setGeoBlocked(blocked);
        try { sessionStorage.setItem(GEO_BLOCKED_KEY, String(blocked)); } catch { /* ignore */ }
      })
      .catch(() => {
        setGeoBlocked(false); // Allow access if geo lookup fails
      });
  }, []);

  // Still checking
  if (verified === null || geoBlocked === null) return null;

  // Geo blocked — show region denied screen
  if (geoBlocked) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-surface border border-border rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 flex flex-col items-center text-center">
          <img src="/logo.jpg" alt="OnlyBae" className="w-16 h-16 rounded-full mb-4" />
          <h2 className="text-foreground text-2xl font-bold mb-2">
            Access Denied
          </h2>
          <p className="text-muted text-sm leading-relaxed">
            This service is not available in your region.
          </p>
        </div>
      </div>
    );
  }

  // Already age-verified
  if (verified) return null;

  const handleAgree = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch { /* ignore */ }
    setVerified(true);
  };

  const handleLeave = () => {
    window.location.href = 'https://www.google.com';
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 flex flex-col items-center text-center">
        <img src="/logo.jpg" alt="OnlyBae" className="w-16 h-16 rounded-full mb-4" />

        <h2 className="text-foreground text-2xl font-bold mb-2">
          Age Verification Required
        </h2>

        <p className="text-muted text-sm leading-relaxed mb-6">
          This website contains age-restricted content. By entering, you confirm
          that you are at least <span className="text-foreground font-semibold">18 years old</span> and
          that viewing such content is legal in your jurisdiction.
        </p>

        <div className="w-full flex flex-col gap-3">
          <button
            onClick={handleAgree}
            className="w-full py-3 px-6 rounded-lg bg-accent hover:bg-accent-hover text-background font-semibold text-sm transition-colors duration-150 cursor-pointer"
          >
            I am 18 or older — Enter
          </button>

          <button
            onClick={handleLeave}
            className="w-full py-3 px-6 rounded-lg bg-surface-hover hover:bg-border text-muted hover:text-foreground font-medium text-sm transition-colors duration-150 cursor-pointer"
          >
            Leave
          </button>
        </div>

        <p className="text-muted text-xs mt-6 leading-relaxed">
          By entering this site, you agree to our <a href="/terms" className="text-accent hover:underline">Terms of Service</a> and <a href="/privacy" className="text-accent hover:underline">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
