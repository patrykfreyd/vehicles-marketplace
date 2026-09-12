import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Internal packages ship raw TS source (no build step, see
  // packages/tsconfig + the root README) — Next must be told to run its own
  // transform over them instead of assuming they're already compiled JS.
  // Every workspace package web imports, directly or transitively, needs to
  // be listed here.
  transpilePackages: ['@vehicles-marketplace/validation', '@vehicles-marketplace/types'],
};

export default nextConfig;
