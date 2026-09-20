import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Photo uploads arrive through server actions, whose default body limit is 1MB.
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  /*
   * pdfkit reads its own font metrics off disk at runtime. Bundled, those reads
   * point at paths that do not exist and every invoice PDF fails on the first line
   * of text. Left external, it resolves them out of node_modules as usual.
   */
  serverExternalPackages: ["pdfkit"],
};

export default config;
