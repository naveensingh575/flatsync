import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      {
        source: '/group/:groupId',
        destination: '/flat/:groupId',
      },
      {
        source: '/group/:groupId/:path*',
        destination: '/flat/:groupId/:path*',
      },
    ];
  },
};

export default nextConfig;
