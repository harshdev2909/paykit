import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/developers/api-keys", destination: "/dashboard/api-keys", permanent: true },
      { source: "/developers/api-keys/:path*", destination: "/dashboard/api-keys/:path*", permanent: true },
      { source: "/developers/docs", destination: "/docs/quickstart", permanent: true },
      { source: "/developers", destination: "/dashboard", permanent: true },
      { source: "/developers/:path*", destination: "/dashboard/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
