import type { NextConfig } from "next";

// Production only: `next dev` needs eval for hot reload. 'wasm-unsafe-eval' lets PGlite compile
// its WebAssembly. 'unsafe-inline' scripts cover Next's inline bootstrap (a nonce would force
// every page to render dynamically). Fonts are self-hosted by next/font, so 'self' suffices.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Content-Security-Policy", value: contentSecurityPolicy }]
    : []),
];

// PostHog goes through this origin (/ingest), so ad blockers and the CSP's connect-src 'self' both
// allow it. Asset rewrites must come before the catch-all (PostHog's Next.js proxy guide).
const posthogRegion = process.env.NEXT_PUBLIC_POSTHOG_REGION?.trim() === "eu" ? "eu" : "us";

const nextConfig: NextConfig = {
  output: "standalone",
  // PostHog's API paths end in a slash (/e/, /flags/); Next would 308 them without this.
  skipTrailingSlashRedirect: true,
  rewrites() {
    return Promise.resolve([
      {
        source: "/ingest/static/:path*",
        destination: `https://${posthogRegion}-assets.i.posthog.com/static/:path*`,
      },
      {
        source: "/ingest/array/:path*",
        destination: `https://${posthogRegion}-assets.i.posthog.com/array/:path*`,
      },
      { source: "/ingest/:path*", destination: `https://${posthogRegion}.i.posthog.com/:path*` },
    ]);
  },
  transpilePackages: ["@tydbase/ui", "@tydbase/wasm-playground"],
  poweredByHeader: false,
  reactStrictMode: true,
  headers() {
    return Promise.resolve([{ source: "/:path*", headers: securityHeaders }]);
  },
};

export default nextConfig;
