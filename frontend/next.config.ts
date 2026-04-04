import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://195.133.30.228/:path*",
      },
    ];
  },
};

export default nextConfig;