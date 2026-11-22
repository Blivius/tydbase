import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@tydbase/ui", "@tydbase/wasm-playground"],
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
