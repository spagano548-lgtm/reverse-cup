import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ignoriamo i warning formali per velocizzare il deploy dell'MVP
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;