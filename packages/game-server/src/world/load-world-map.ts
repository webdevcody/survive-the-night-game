import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getConfig } from "@shared/config";
import type {
  WorldMapDialogueNpcEntry,
  WorldMapMerchantEntry,
  WorldMapMessageDecalEntry,
  WorldMapSpawnerMetaEntry,
} from "@shared/map/world-map-types";
import type { WorldMapQuestDefinition } from "@shared/map/quest-types";
import {
  mergeWorldMapMainWithSidecars,
  WORLD_MAP_NPCS_FILENAME,
  WORLD_MAP_QUESTS_FILENAME,
  type WorldMapSidecarParseResult,
} from "@shared/map/world-map-sidecars";
import {
  applyDialogueNpcEditorMetadataToRawDialogueNpcs,
  parseDialogueNpcEditorMetadataFromQuestsSidecar,
} from "@shared/map/world-map-types";

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
  /** Optional per-tile merchant stock overrides (shopkeeper decal / merchant collidable). */
  merchantMeta?: WorldMapMerchantEntry[];
}

function resolveWorldMapJsonPath(): string {
  // Resolve next to this module first so reloads always hit the package's world-map.json
  // regardless of process.cwd() (monorepo / IDE / alternate entrypoints).
  let adjacentToModule: string | null = null;
  try {
    adjacentToModule = path.join(path.dirname(fileURLToPath(import.meta.url)), "world-map.json");
  } catch {
    /* ignore */
  }
  if (adjacentToModule && fs.existsSync(adjacentToModule)) {
    return adjacentToModule;
  }

  const cwd = process.cwd();
  const srcPath = path.join(cwd, "src", "world", "world-map.json");
  const distPath = path.join(cwd, "dist", "world-map.json");
  // Prefer src: the map editor writes here; dist is only updated on build and would stay stale.
  if (fs.existsSync(srcPath)) {
    return srcPath;
  }
  if (fs.existsSync(distPath)) {
    return distPath;
  }
  return adjacentToModule ?? srcPath;
}

function tryReadWorldMapSidecarSync(filePath: string): WorldMapSidecarParseResult {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as unknown;
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return null;
    }
    throw e;
  }
}

export function tryLoadWorldMapFile(): WorldMapFile | null {
  const filePath = resolveWorldMapJsonPath();
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as WorldMapFile;
    const dir = path.dirname(filePath);
    const npcsParsed = tryReadWorldMapSidecarSync(path.join(dir, WORLD_MAP_NPCS_FILENAME));
    const questsParsed = tryReadWorldMapSidecarSync(path.join(dir, WORLD_MAP_QUESTS_FILENAME));
    const merged = mergeWorldMapMainWithSidecars(data, npcsParsed, questsParsed);
    const editorMeta = parseDialogueNpcEditorMetadataFromQuestsSidecar(questsParsed);
    let dialogueNpcs = merged.dialogueNpcs;
    if (editorMeta.length > 0) {
      dialogueNpcs = applyDialogueNpcEditorMetadataToRawDialogueNpcs(
        dialogueNpcs,
        editorMeta,
      ) as WorldMapFile["dialogueNpcs"];
    }
    return {
      ...data,
      dialogueNpcs,
      quests: merged.quests as WorldMapFile["quests"],
    };
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
