import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { optimizePackageImports: ["lucide-react", "recharts"] },
  serverExternalPackages: ["@napi-rs/canvas", "pdf-parse"],
};

export default nextConfig;
