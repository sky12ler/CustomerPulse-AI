import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { optimizePackageImports: ["lucide-react", "recharts"] },
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
