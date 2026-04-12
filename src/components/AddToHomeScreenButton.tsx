'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMobileScreenButton, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { usePwaInstall } from '@/hooks/usePwaInstall';

// Explicit "Install app" button.
// Behavior:
//   - App already installed: renders a small "Installed" badge (or null in compact mode).
//   - Chrome / Edge / Android (canPromptInstall): fires the native prompt.
//   - iOS Safari: opens a modal with the Share → Add to Home Screen steps.
//   - Unsupported browsers (Firefox desktop, etc): opens the same modal with generic copy.
//
// `compact` renders as a full-width sidebar row instead of the big Profile-page button,
// so the same component can live in the sidebar footer for logged-out users too.
export default function AddToHomeScreenButton({ compact = false }: { compact?: boolean }) {
  const { installed, canPromptInstall, needsIosInstructions, promptInstall } = usePwaInstall();
  const [showIosModal, setShowIosModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (installed) {
    if (compact) return null;
    return (
      <div className="inline-flex items-center gap-2 text-sm text-emerald-400">
        <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5" />
        App installed — you&apos;re using it now
      </div>
    );
  }

  const handleClick = async () => {
    setError(null);

    if (canPromptInstall) {
      const outcome = await promptInstall();
      if (outcome === 'unavailable') {
        // Prompt failed unexpectedly — fall back to the manual instructions.
        setShowIosModal(true);
      }
      // 'accepted' and 'dismissed' both update `installed` via appinstalled
      // or the user closed the dialog; no further action needed.
      return;
    }

    // iOS or unsupported browsers: show manual instructions.
    setShowIosModal(true);
  };

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={handleClick}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-accent hover:bg-surface-hover transition-colors duration-150 cursor-pointer"
        >
          <FontAwesomeIcon icon={faMobileScreenButton} className="w-4 h-4" />
          Add to Home Screen
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-colors cursor-pointer"
        >
          <FontAwesomeIcon icon={faMobileScreenButton} className="w-3.5 h-3.5" />
          Add to Home Screen
        </button>
      )}
      {error && !compact && <p className="text-xs text-red-400 mt-2">{error}</p>}

      {showIosModal && (
        <InstallInstructionsModal
          onClose={() => setShowIosModal(false)}
          iosOnly={needsIosInstructions}
        />
      )}
    </>
  );
}

function InstallInstructionsModal({ onClose, iosOnly }: { onClose: () => void; iosOnly: boolean }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl p-6"
        style={{
          paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-hover text-foreground cursor-pointer"
        >
          <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <img src="/logo.jpg" alt="" className="w-12 h-12 rounded-xl object-cover" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">Install OnlyBae</h3>
            <p className="text-xs text-muted">Full-screen experience, no browser bars</p>
          </div>
        </div>

        {iosOnly ? <IosSteps /> : <GenericSteps />}

        <button
          onClick={onClose}
          className="w-full mt-6 h-11 rounded-lg bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function IosSteps() {
  return (
    <ol className="space-y-3 text-sm text-secondary">
      <li className="flex gap-3">
        <StepNumber>1</StepNumber>
        <div className="flex-1">
          Tap the <strong className="text-foreground">Share</strong> button <ShareIcon /> at the bottom of Safari.
        </div>
      </li>
      <li className="flex gap-3">
        <StepNumber>2</StepNumber>
        <div className="flex-1">
          Scroll down and choose <strong className="text-foreground">Add to Home Screen</strong>.
        </div>
      </li>
      <li className="flex gap-3">
        <StepNumber>3</StepNumber>
        <div className="flex-1">
          Tap <strong className="text-foreground">Add</strong> in the top right. OnlyBae appears on your home screen.
        </div>
      </li>
    </ol>
  );
}

function GenericSteps() {
  return (
    <div className="text-sm text-secondary space-y-3">
      <p>
        Your browser doesn&apos;t support one-tap install. To install OnlyBae as an app:
      </p>
      <ul className="space-y-2 list-disc pl-5">
        <li>
          <strong className="text-foreground">Chrome / Edge (Android or Desktop)</strong>: open the menu (⋮) → <strong className="text-foreground">Install app</strong> or <strong className="text-foreground">Add to Home screen</strong>.
        </li>
        <li>
          <strong className="text-foreground">Safari (iOS)</strong>: tap the Share icon → <strong className="text-foreground">Add to Home Screen</strong>.
        </li>
        <li>
          <strong className="text-foreground">Firefox / other</strong>: look for &ldquo;Install&rdquo; or &ldquo;Add to Home screen&rdquo; in the browser menu.
        </li>
      </ul>
    </div>
  );
}

function StepNumber({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-semibold flex items-center justify-center">
      {children}
    </span>
  );
}

function ShareIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block -translate-y-[1px] mx-0.5"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m8 7 4-4 4 4" />
      <rect x="4" y="15" width="16" height="6" rx="2" />
    </svg>
  );
}
