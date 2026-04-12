import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, "../src");

/** @type {string[]} */
const bad = [];

function walk(dir) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      walk(full);
      continue;
    }
    if (name.name.endsWith(".js") || name.name.endsWith(".js.map")) {
      bad.push(path.relative(srcRoot, full));
      continue;
    }
    if (name.name.endsWith(".d.ts")) {
      const tsSibling = path.join(dir, name.name.replace(/\.d\.ts$/, ".ts"));
      if (fs.existsSync(tsSibling)) {
        bad.push(path.relative(srcRoot, full));
      }
    }
  }
}

walk(srcRoot);

if (bad.length) {
  console.error(
    "Unexpected emit artifacts under src/ (`packages/game-server` uses `noEmit: true`; use `tsx` / `tsup`, not `tsc` emit into src/):\n" +
      bad.map((p) => `  ${p}`).join("\n")
  );
  process.exit(1);
}
