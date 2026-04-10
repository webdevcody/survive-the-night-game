import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getConfig } from "@shared/config";
import type {
  WorldMapDialogueNpcEntry,
  WorldMapMessageDecalEntry,
  WorldMapSpawnerMetaEntry,
} from "@shared/map/world-map-types";
import type { WorldMapQuestDefinition } from "@shared/map/quest-types";

export interface WorldMapFile {
  ground: number[][];
  collidables: number[][];
  /** Omitted in legacy files; treated as all zeros when missing. */
  spawns?: number[][];
  /** Omitted in legacy files; treated as all zeros when missing. */
  decals?: number[][];
  /** Optional dialogue NPC placements (see shared `WorldMapDialogueNpcEntry`). */
  dialogueNpcs?: WorldMapDialogueNpcEntry[];
  /** Optional message decals (`DECAL_TILE_MESSAGE`); see `WorldMapMessageDecalEntry`. */
  messageDecals?: WorldMapMessageDecalEntry[];
  /** Optional authored quests (see `WorldMapQuestDefinition`). */
  quests?: WorldMapQuestDefinition[];
  /** Optional spawner labels and respawn overrides from the map editor. */
  spawnerMeta?: WorldMapSpawnerMetaEntry[];
}

function resolveWorldMapJsonPath(): string {
  const cwd = process.cwd();
  const distPath = path.join(cwd, "dist", "world-map.json");
  const srcPath = path.join(cwd, "src", "world", "world-map.json");
  // Prefer src: the map editor writes here; dist is only updated on build and would stay stale.
  if (fs.existsSync(srcPath)) {
    return srcPath;
  }
  if (fs.existsSync(distPath)) {
    return distPath;
  }
  try {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    return path.join(dir, "world-map.json");
  } catch {
    return srcPath;
  }
}

export function tryLoadWorldMapFile(): WorldMapFile | null {
  const filePath = resolveWorldMapJsonPath();
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as WorldMapFile;
    return data;
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return null;
    }
    throw e;
  }
}

export function validateWorldMapDimensions(data: WorldMapFile): boolean {
  const n = getConfig().world.BIOME_SIZE * getConfig().world.MAP_SIZE;
  if (!data.ground || !data.collidables) {
    return false;
  }
  if (data.ground.length !== n || data.collidables.length !== n) {
    return false;
  }
  for (let i = 0; i < n; i++) {
    if (data.ground[i]?.length !== n || data.collidables[i]?.length !== n) {
      return false;
    }
  }
  if (data.spawns !== undefined) {
    if (data.spawns.length !== n) {
      return false;
    }
    for (let i = 0; i < n; i++) {
      if (data.spawns[i]?.length !== n) {
        return false;
      }
    }
  }
  if (data.decals !== undefined) {
    if (data.decals.length !== n) {
      return false;
    }
    for (let i = 0; i < n; i++) {
      if (data.decals[i]?.length !== n) {
        return false;
      }
    }
  }
  return true;
}
