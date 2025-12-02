import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

// @ts-ignore - nitro plugin has type issues with the monorepo vite versions
export default defineConfig(() => {
  return {
    server: {
      port: 3000,
    },
    plugins: [
      tsConfigPaths({ projects: [".", "../game-shared", "../game-client"] }),
      tailwindcss(),
      tanstackStart(),
      nitro(),
      viteReact(),
    ],
    nitro: {},
  };
});
