import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["cjs"],
  platform: "node",
  target: "node18",
  outDir: "dist",
  outExtension: () => ({ js: ".cjs" }),
});
