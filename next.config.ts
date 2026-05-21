import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export',
  // GitHub Pages deployment usually happens at /<repository-name>/
  // Use NEXT_PUBLIC_BASE_PATH=/score-counter for that deployment target.
  basePath,
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
