import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export',
  // GitHub Pages deployment usually happens at /<repository-name>/
  // If you are deploying to a custom domain, remove the basePath
  basePath: isProd ? '/score-counter' : '',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
