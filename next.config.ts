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
        source: '/list',
        destination: '/flat/current',
      },
      {
        source: '/groups',
        destination: '/flat/current/groups',
      },
      {
        source: '/history',
        destination: '/flat/current/history',
      },
      {
        source: '/profile',
        destination: '/flat/current/profile',
      },
      {
        source: '/settings',
        destination: '/flat/current/settings',
      },
      {
        source: '/g/:groupId',
        destination: '/flat/:groupId',
      },
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
