import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // PGlite (embedded Postgres used for local development) ships WASM and must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  experimental: {
    // Gym Wi-Fi is unreliable: when the network drops, navigations and Server Actions
    // (e.g. logging a set) stay pending and are retried automatically once it's back.
    useOffline: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
