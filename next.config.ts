import type { NextConfig } from "next";
import { execSync } from "child_process";

// Resolve a short, stable build identifier we can show in the UI footer.
// Preference order:
//   1. Explicit NEXT_PUBLIC_APP_VERSION (useful in CI / Docker builds).
//   2. Vercel's auto-injected commit SHA (only present on Vercel).
//   3. Local git short SHA (falls back to this in local/self-hosted builds).
//   4. "dev" as a last resort if nothing above works.
// The value flows into the client bundle at build time via env below, so it
// stays baked in for every deployed build. Users can click the version in the
// sidebar to copy it and send to support when reporting bugs.
function resolveAppVersion(): string {
  if (process.env.NEXT_PUBLIC_APP_VERSION) return process.env.NEXT_PUBLIC_APP_VERSION;
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "dev";
  }
}

const nextConfig: NextConfig = {
  trailingSlash: false,
  env: {
    NEXT_PUBLIC_APP_VERSION: resolveAppVersion(),
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' }
    ]
  }
};

export default nextConfig;
