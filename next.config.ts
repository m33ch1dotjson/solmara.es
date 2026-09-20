import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // The client home lists the services, so a bare /services has nothing to show.
  async redirects() {
    return [
      { source: "/services", destination: "/", permanent: false },
      { source: "/admin/settings", destination: "/admin/settings/branding", permanent: false },
    ];
  },
};

export default config;
