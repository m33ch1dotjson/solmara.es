import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Photo uploads arrive through server actions, whose default body limit is 1MB.
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
};

export default config;
