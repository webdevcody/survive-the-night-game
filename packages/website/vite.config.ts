import path from "node:path";
import { fileURLToPath } from "node:url";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig, loadEnv, type Plugin } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

const websiteRoot = path.dirname(fileURLToPath(import.meta.url));
const packagesRoot = path.resolve(websiteRoot, "..");
const gameClientSrc = path.join(packagesRoot, "game-client", "src");
const gameSharedSrc = path.join(packagesRoot, "game-shared", "src");

/** Workspace sources live outside the website root; register them so edits trigger HMR. */
function watchWorkspacePackages(): Plugin {
  return {
    name: "watch-workspace-packages",
    configureServer(server) {
      server.watcher.add(gameClientSrc);
      server.watcher.add(gameSharedSrc);
    },
  };
}

// Ensure `.env` values (e.g. GAME_SERVER_API_KEY) are on process.env for server functions / Nitro.
// Without this, getGameAuthToken can see an unset key even when packages/website/.env defines it.
function mergeEnvIntoProcessEnv(mode: string): void {
  const loaded = loadEnv(mode, websiteRoot, "");
  for (const [key, value] of Object.entries(loaded)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

// @ts-ignore - nitro plugin has type issues with the monorepo vite versions
export default defineConfig(({ mode }) => {
  mergeEnvIntoProcessEnv(mode);

  return {
    server: {
      port: 3000,
      fs: {
        allow: [websiteRoot, packagesRoot],
      },
    },
    optimizeDeps: {
      exclude: [
        "@survive-the-night/game-client",
        "@survive-the-night/game-shared",
      ],
    },
    plugins: [
      watchWorkspacePackages(),
      tsConfigPaths({ projects: [".", "../game-shared", "../game-client"] }),
      tailwindcss(),
      tanstackStart(),
      nitro(),
      viteReact(),
    ],
    nitro: {},
    envDir: websiteRoot,
  };
});
