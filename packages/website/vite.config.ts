import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import path from "path";
import { nitro } from "nitro/vite";

// @ts-ignore
export default defineConfig(({ mode }) => {
  return {
    server: {
      port: 3000,
    },
    plugins: [
      tsConfigPaths({ projects: [".", "../game-client", "../game-shared"] }),
      tailwindcss(),
      nitro(),
      viteReact(),
    ],
    resolve: {
      alias: {
        // Resolve @/ aliases from game-client
        "@/": path.resolve(__dirname, "../game-client/src/"),
        // Resolve @shared/ aliases from game-shared
        "@shared/": path.resolve(__dirname, "../game-shared/src/"),
        "@events/": path.resolve(__dirname, "../game-shared/src/events/"),
      },
    },
  };
});
