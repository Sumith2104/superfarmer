import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',

  // Skip ESLint during `next build` — lint runs in dev, not in CI/Render
  eslint: { ignoreDuringBuilds: true },

  // Allow images from external sources
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
