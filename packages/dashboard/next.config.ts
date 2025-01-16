import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "../game-client/src"),
      "@shared": path.resolve(__dirname, "../game-shared/src"),
    };
    return config;
  },
};

export default nextConfig;
