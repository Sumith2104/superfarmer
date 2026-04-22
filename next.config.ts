import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // Required for Render / Docker deployments
  
  // Allow images from external sources
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
