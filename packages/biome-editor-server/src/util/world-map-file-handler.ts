import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getConfig } from "@survive-the-night/game-shared/config";
import { resizeSquareLayersTopLeft } from "@survive-the-night/game-shared/map/world-map-resize";
import type {
  WorldMapDialogueNpcEntry,
  WorldMapSpawnerMetaEntry,
} from "@survive-the-night/game-shared/map/world-map-types";
import {
  normalizeDialogueNpcs,
  reconcileSpawnerMetaWithSpawnsLayer,
} from "@survive-the-night/game-shared/map/world-map-types";
import type { WorldMapQuestDefinition } from "@survive-the-night/game-shared/map/quest-types";
import { normalizeQuests } from "@survive-the-night/game-shared/map/quest-types";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

function getWorldMapPath(): string | null {
  if (IS_PRODUCTION) {
    return null;
  }
  if (typeof import.meta.url === "undefined") {
    return null;
  }
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.join(currentDir, "..", "..", "..", "game-server", "src", "world", "world-map.json");
}

function getWorldConfigPath(): string | null {
  if (IS_PRODUCTION) {
    return null;
  }
  if (typeof import.meta.url === "undefined") {
    return null;
  }
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.join(currentDir, "..", "..", "..", "game-shared", "src", "config", "world-config.ts");
}

const WORLD_MAP_PATH = getWorldMapPath();
const WORLD_CONFIG_PATH = getWorldConfigPath();

function ensureEditorAvailable() {
  if (!WORLD_MAP_PATH) {
    throw new Error("World map editor is only available in development mode");
  }
}

export interface WorldMapData {
  ground: number[][];
  collidables: number[][];
  spawns: number[][];
  decals: number[][];
  dialogueNpcs?: WorldMapDialogueNpcEntry[];
  quests?: WorldMapQuestDefinition[];
  /** Optional labels for non-dialogue spawner tiles (editor + future runtime use). */
  spawnerMeta?: WorldMapSpawnerMetaEntry[];
}

/** Uses in-memory config (may differ from disk until server reload). Prefer disk helpers in this module. */
export function getFullMapTileCount(): number {
  const { BIOME_SIZE, MAP_SIZE } = getConfig().world;
  return BIOME_SIZE * MAP_SIZE;
}

export function parseWorldConfigFromDisk(): { BIOME_SIZE: number; MAP_SIZE: number } {
  if (!WORLD_CONFIG_PATH) {
    throw new Error("World config path is not available");
  }
  const text = fsSync.readFileSync(WORLD_CONFIG_PATH, "utf-8");
  const mBiome = text.match(/^\s*BIOME_SIZE:\s*(\d+)/m);
  const mMap = text.match(/^\s*MAP_SIZE:\s*(\d+)/m);
  if (!mBiome || !mMap) {
    throw new Error("Could not parse BIOME_SIZE / MAP_SIZE from world-config.ts");
  }
  return {
    BIOME_SIZE: parseInt(mBiome[1]!, 10),
    MAP_SIZE: parseInt(mMap[1]!, 10),
  };
}

function getExpectedTileCountFromDisk(): number {
  const { BIOME_SIZE, MAP_SIZE } = parseWorldConfigFromDisk();
  return BIOME_SIZE * MAP_SIZE;
}

function createEmptySpawnsLayer(n: number): number[][] {
  return Array(n)
    .fill(0)
    .map(() => Array(n).fill(0));
}

function createEmptyDecalsLayer(n: number): number[][] {
  return Array(n)
    .fill(0)
    .map(() => Array(n).fill(0));
}

export function createEmptyWorldMap(): WorldMapData {
  const n = getExpectedTileCountFromDisk();
  const ground = Array(n)
    .fill(0)
    .map(() => Array(n).fill(0));
  const collidables = Array(n)
    .fill(0)
    .map(() => Array(n).fill(-1));
  return {
    ground,
    collidables,
    spawns: createEmptySpawnsLayer(n),
    decals: createEmptyDecalsLayer(n),
    dialogueNpcs: [],
    quests: [],
    spawnerMeta: [],
  };
}

export async function readWorldMap(): Promise<WorldMapData> {
  ensureEditorAvailable();
  try {
    const raw = await fs.readFile(WORLD_MAP_PATH!, "utf-8");
    const data = JSON.parse(raw) as Partial<WorldMapData>;
    if (!data.ground || !data.collidables) {
      return createEmptyWorldMap();
    }
    const n = getExpectedTileCountFromDisk();
    let spawns = data.spawns;
    if (!spawns || spawns.length !== n) {
      spawns = createEmptySpawnsLayer(n);
    } else {
      for (let i = 0; i < n; i++) {
        if (!spawns[i] || spawns[i]!.length !== n) {
          spawns = createEmptySpawnsLayer(n);
          break;
        }
      }
    }
    let decals = data.decals;
    if (!decals || decals.length !== n) {
      decals = createEmptyDecalsLayer(n);
    } else {
      for (let i = 0; i < n; i++) {
        if (!decals[i] || decals[i]!.length !== n) {
          decals = createEmptyDecalsLayer(n);
          break;
        }
      }
    }
    const dialogueNpcs = normalizeDialogueNpcs(data.dialogueNpcs, n);
    const quests = normalizeQuests(data.quests, n);
    const spawnerMeta = reconcileSpawnerMetaWithSpawnsLayer(spawns, data.spawnerMeta);
    return {
      ground: data.ground,
      collidables: data.collidables,
      spawns,
      decals,
      dialogueNpcs,
      quests,
      spawnerMeta,
    };
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return createEmptyWorldMap();
    }
    throw e;
  }
}

function validateDimensions(data: WorldMapData): string | null {
  const n = getExpectedTileCountFromDisk();
  if (
    data.ground.length !== n ||
    data.collidables.length !== n ||
    data.spawns.length !== n ||
    data.decals.length !== n
  ) {
    return `Invalid dimensions: expected ${n} rows`;
  }
  for (let i = 0; i < n; i++) {
    if (
      data.ground[i]?.length !== n ||
      data.collidables[i]?.length !== n ||
      data.spawns[i]?.length !== n ||
      data.decals[i]?.length !== n
    ) {
      return `Invalid dimensions: all rows must have length ${n}`;
    }
  }
  return null;
}

export async function writeWorldMap(data: WorldMapData): Promise<void> {
  ensureEditorAvailable();
  const err = validateDimensions(data);
  if (err) {
    throw new Error(err);
  }
  await fs.writeFile(WORLD_MAP_PATH!, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

async function readWorldMapRawFromDisk(): Promise<WorldMapData> {
  ensureEditorAvailable();
  let raw: string;
  try {
    raw = await fs.readFile(WORLD_MAP_PATH!, "utf-8");
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return createEmptyWorldMap();
    }
    throw e;
  }
  const data = JSON.parse(raw) as Partial<WorldMapData>;
  if (!data.ground?.length || !data.collidables?.length) {
    return createEmptyWorldMap();
  }
  const oldN = data.ground.length;
  if (
    data.collidables.length !== oldN ||
    data.ground.some((row) => row.length !== oldN) ||
    data.collidables.some((row) => row.length !== oldN)
  ) {
    throw new Error("World map ground/collidables must be square and matching dimensions");
  }
  let spawns = data.spawns;
  if (!spawns || spawns.length !== oldN) {
    spawns = createEmptySpawnsLayer(oldN);
  } else {
    for (let i = 0; i < oldN; i++) {
      if (!spawns[i] || spawns[i]!.length !== oldN) {
        spawns = createEmptySpawnsLayer(oldN);
        break;
      }
    }
  }
  let decals = data.decals;
  if (!decals || decals.length !== oldN) {
    decals = createEmptyDecalsLayer(oldN);
  } else {
    for (let i = 0; i < oldN; i++) {
      if (!decals[i] || decals[i]!.length !== oldN) {
        decals = createEmptyDecalsLayer(oldN);
        break;
      }
    }
  }
  const dialogueNpcs = normalizeDialogueNpcs(data.dialogueNpcs, oldN);
  const quests = normalizeQuests(data.quests, oldN);
  const spawnerMeta = reconcileSpawnerMetaWithSpawnsLayer(spawns, data.spawnerMeta);
  return {
    ground: data.ground,
    collidables: data.collidables,
    spawns,
    decals,
    dialogueNpcs,
    quests,
    spawnerMeta,
  };
}

async function patchWorldConfigMapSize(newMapSize: number): Promise<void> {
  if (!WORLD_CONFIG_PATH) {
    throw new Error("World config path is not available");
  }
  const text = await fs.readFile(WORLD_CONFIG_PATH, "utf-8");
  const replaced = text.replace(/(^\s*MAP_SIZE:\s*)\d+/m, `$1${newMapSize}`);
  if (replaced === text) {
    throw new Error("Could not patch MAP_SIZE in world-config.ts");
  }
  await fs.writeFile(WORLD_CONFIG_PATH, replaced, "utf-8");
}

export interface ExpandWorldMapResult {
  mapSizeBiomes: number;
  tileSize: number;
}

/**
 * Expands the world map (top-left anchored padding), updates world-map.json and MAP_SIZE in world-config.ts on disk.
 */
export async function expandWorldMap(mapSizeBiomes: number): Promise<ExpandWorldMapResult> {
  ensureEditorAvailable();
  if (!WORLD_CONFIG_PATH) {
    throw new Error("World config path is not available");
  }
  if (!Number.isInteger(mapSizeBiomes) || mapSizeBiomes < 1) {
    throw new Error("mapSizeBiomes must be a positive integer");
  }

  const { BIOME_SIZE, MAP_SIZE: currentMapSizeBiomes } = parseWorldConfigFromDisk();
  if (mapSizeBiomes < currentMapSizeBiomes) {
    throw new Error(
      `mapSizeBiomes must be >= current MAP_SIZE (${currentMapSizeBiomes}); shrinking is not supported`,
    );
  }

  const newN = BIOME_SIZE * mapSizeBiomes;
  const diskExpectedN = BIOME_SIZE * currentMapSizeBiomes;

  const raw = await readWorldMapRawFromDisk();
  const oldN = raw.ground.length;
  if (oldN !== diskExpectedN) {
    throw new Error(
      `World map file is ${oldN}×${oldN} tiles but world-config.ts expects ${diskExpectedN}×${diskExpectedN} (BIOME_SIZE=${BIOME_SIZE}, MAP_SIZE=${currentMapSizeBiomes}). Fix the mismatch before expanding.`,
    );
  }

  if (mapSizeBiomes === currentMapSizeBiomes) {
    return { mapSizeBiomes: currentMapSizeBiomes, tileSize: oldN };
  }

  const resized = resizeSquareLayersTopLeft(raw, newN, {
    ground: 0,
    collidables: -1,
    spawns: 0,
    decals: 0,
  });

  const expanded: WorldMapData = {
    ...resized,
    dialogueNpcs: raw.dialogueNpcs ?? [],
    quests: raw.quests ?? [],
    spawnerMeta: reconcileSpawnerMetaWithSpawnsLayer(resized.spawns, raw.spawnerMeta),
  };

  const previousConfigText = await fs.readFile(WORLD_CONFIG_PATH, "utf-8");

  await patchWorldConfigMapSize(mapSizeBiomes);

  try {
    const err = validateDimensions(expanded);
    if (err) {
      throw new Error(err);
    }
    await fs.writeFile(WORLD_MAP_PATH!, JSON.stringify(expanded, null, 2) + "\n", "utf-8");
  } catch (e) {
    await fs.writeFile(WORLD_CONFIG_PATH, previousConfigText, "utf-8");
    throw e;
  }

  return { mapSizeBiomes, tileSize: newN };
}
