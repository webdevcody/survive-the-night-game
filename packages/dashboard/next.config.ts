import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    // Modify the module resolution
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve.alias,
        "@": path.resolve(__dirname, "../game-client/src"),
        "@shared": path.resolve(__dirname, "../game-shared/src"),
      },
      modules: [
        ...(config.resolve.modules || []),
        path.resolve(__dirname, "../game-client/src"),
        "node_modules",
      ],
    };
    return config;
  },
  transpilePackages: ["@survive-the-night/game-client"],
};

export default nextConfig;
