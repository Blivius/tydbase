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

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@tydbase/ui", "@tydbase/wasm-playground"],
  poweredByHeader: false,
  reactStrictMode: true,
  headers() {
    return Promise.resolve([{ source: "/:path*", headers: securityHeaders }]);
  },
};

export default nextConfig;
