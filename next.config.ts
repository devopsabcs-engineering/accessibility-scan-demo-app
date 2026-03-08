import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "axe-core",
    "crawlee",
    "cacheable-request",
    "@crawlee/playwright",
    "@crawlee/browser-pool",
    "@crawlee/core",
    "@crawlee/utils",
    "@crawlee/types",
    "@crawlee/memory-storage",
    "accessibility-checker",
  ],
};

export default nextConfig;
