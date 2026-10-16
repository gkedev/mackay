import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  devIndicators: false,
  agentRules: false,
  experimental: { cpus: 2 },
};

export default nextConfig;
