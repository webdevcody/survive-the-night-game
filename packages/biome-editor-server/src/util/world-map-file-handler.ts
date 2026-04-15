import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getConfig } from "@survive-the-night/game-shared/config";
import { resizeSquareLayersTopLeft } from "@survive-the-night/game-shared/map/world-map-resize";
import type {
  WorldMapDialogueNpcEditorMetadata,
  WorldMapDialogueNpcEntry,
  WorldMapMerchantEntry,
  WorldMapMessageDecalEntry,
  WorldMapSpawnerMetaEntry,
} from "@survive-the-night/game-shared/map/world-map-types";
import {
  applyDialogueNpcEditorMetadataToRawDialogueNpcs,
  extractDialogueNpcEditorMetadataForQuestsJson,
  normalizeDialogueNpcs,
  parseDialogueNpcEditorMetadataFromQuestsSidecar,
  reconcileMerchantMetaWithMerchantTiles,
  reconcileMessageDecalsWithDecalsLayer,
  reconcileSpawnerMetaWithSpawnsLayer,
  rewriteSpawnsLayerDialogueNpcTiles,
} from "@survive-the-night/game-shared/map/world-map-types";
import type { WorldMapQuestDefinition } from "@survive-the-night/game-shared/map/quest-types";
import { normalizeQuests } from "@survive-the-night/game-shared/map/quest-types";
import {
  mergeWorldMapMainWithSidecars,
  stripWorldMapSidecarsForMainFile,
  WORLD_MAP_NPCS_FILENAME,
  WORLD_MAP_QUESTS_FILENAME,
  type WorldMapSidecarParseResult,
} from "@survive-the-night/game-shared/map/world-map-sidecars";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Resolves `packages/<pkg>/...` whether this module loads from `src/util/` (tsx dev) or `dist/`
 * (one fewer `..` to `packages/`). Picks the candidate whose parent directory exists.
 */
function resolveUnderPackages(pkgRelPathFromPackages: string): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const viaUtil = path.join(currentDir, "..", "..", "..", pkgRelPathFromPackages);
  const viaShallow = path.join(currentDir, "..", "..", pkgRelPathFromPackages);
  const utilDir = path.dirname(viaUtil);
  const shallowDir = path.dirname(viaShallow);
  const utilOk = fsSync.existsSync(utilDir);
  const shallowOk = fsSync.existsSync(shallowDir);
  if (utilOk && shallowOk) {
    return viaUtil;
  }
  if (utilOk) {
    return viaUtil;
  }
  if (shallowOk) {
    return viaShallow;
  }
  return viaUtil;
}

function getWorldMapPath(): string | null {
  if (IS_PRODUCTION) {
    return null;
  }
  if (typeof import.meta.url === "undefined") {
    return null;
  }
  return resolveUnderPackages(path.join("game-server", "src", "world", "world-map.json"));
}

function getWorldConfigPath(): string | null {
  if (IS_PRODUCTION) {
    return null;
  }
  if (typeof import.meta.url === "undefined") {
    return null;
  }
  return resolveUnderPackages(path.join("game-shared", "src", "config", "world-config.ts"));
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
  messageDecals?: WorldMapMessageDecalEntry[];
  quests?: WorldMapQuestDefinition[];
  /** Optional labels for non-dialogue spawner tiles (editor + future runtime use). */
  spawnerMeta?: WorldMapSpawnerMetaEntry[];
  /** Per-tile merchant stock overrides (saved in main world-map.json). */
  merchantMeta?: WorldMapMerchantEntry[];
  /** From `world-map-quests.json` (`dialogueNpcEditorMetadata`); merge into NPCs before `normalizeDialogueNpcs`. */
  dialogueNpcEditorMetadata?: WorldMapDialogueNpcEditorMetadata[];
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
    messageDecals: [],
    quests: [],
    spawnerMeta: [],
    merchantMeta: [],
  };
}

async function tryReadWorldMapSidecar(filePath: string): Promise<WorldMapSidecarParseResult> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as unknown;
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return null;
    }
    throw e;
  }
}

export async function readWorldMap(): Promise<WorldMapData> {
  ensureEditorAvailable();
  try {
    const raw = await fs.readFile(WORLD_MAP_PATH!, "utf-8");
    const data = JSON.parse(raw) as Partial<WorldMapData>;
    if (!data.ground || !data.collidables) {
      return createEmptyWorldMap();
    }
    const mapDir = path.dirname(WORLD_MAP_PATH!);
    const npcsParsed = await tryReadWorldMapSidecar(path.join(mapDir, WORLD_MAP_NPCS_FILENAME));
    const questsParsed = await tryReadWorldMapSidecar(path.join(mapDir, WORLD_MAP_QUESTS_FILENAME));
    const merged = mergeWorldMapMainWithSidecars(data, npcsParsed, questsParsed);
    const editorMeta = parseDialogueNpcEditorMetadataFromQuestsSidecar(questsParsed);
    let mergedDialogue = merged.dialogueNpcs;
    if (editorMeta.length > 0) {
      mergedDialogue = applyDialogueNpcEditorMetadataToRawDialogueNpcs(
        mergedDialogue,
        editorMeta,
      ) as WorldMapData["dialogueNpcs"];
    }
    const dataWithSidecars: Partial<WorldMapData> = {
      ...data,
      dialogueNpcs: mergedDialogue,
      quests: merged.quests as WorldMapData["quests"],
    };
    const n = getExpectedTileCountFromDisk();
    let spawns = dataWithSidecars.spawns;
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
    let decals = dataWithSidecars.decals;
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
    const dialogueNpcs = normalizeDialogueNpcs(dataWithSidecars.dialogueNpcs, n);
    rewriteSpawnsLayerDialogueNpcTiles(spawns, dialogueNpcs);
    const messageDecals = reconcileMessageDecalsWithDecalsLayer(
      decals,
      dataWithSidecars.messageDecals,
      n,
    );
    const quests = normalizeQuests(dataWithSidecars.quests, n);
    const spawnerMeta = reconcileSpawnerMetaWithSpawnsLayer(spawns, dataWithSidecars.spawnerMeta);
    const merchantMeta = reconcileMerchantMetaWithMerchantTiles(
      decals,
      data.collidables,
      data.merchantMeta,
      n,
    );
    return {
      ground: data.ground,
      collidables: data.collidables,
      spawns,
      decals,
      dialogueNpcs,
      messageDecals,
      quests,
      spawnerMeta,
      merchantMeta,
      dialogueNpcEditorMetadata: editorMeta,
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

export interface WorldMapBundleSavedPaths {
  main: string;
  npcs: string;
  quests: string;
}

async function writeWorldMapBundleToDisk(data: WorldMapData): Promise<WorldMapBundleSavedPaths> {
  const err = validateDimensions(data);
  if (err) {
    throw new Error(err);
  }
  const mapDir = path.dirname(WORLD_MAP_PATH!);
  const npcsPath = path.join(mapDir, WORLD_MAP_NPCS_FILENAME);
  const questsPath = path.join(mapDir, WORLD_MAP_QUESTS_FILENAME);
  const mainPayload = stripWorldMapSidecarsForMainFile({ ...data } as Record<string, unknown>);
  await fs.writeFile(WORLD_MAP_PATH!, JSON.stringify(mainPayload, null, 2) + "\n", "utf-8");
  await fs.writeFile(
    npcsPath,
    JSON.stringify({ dialogueNpcs: data.dialogueNpcs ?? [] }, null, 2) + "\n",
    "utf-8",
  );
  const editorMeta = extractDialogueNpcEditorMetadataForQuestsJson(data.dialogueNpcs);
  const questsPayload: Record<string, unknown> = { quests: data.quests ?? [] };
  if (editorMeta.length > 0) {
    questsPayload.dialogueNpcEditorMetadata = editorMeta;
  }
  await fs.writeFile(questsPath, JSON.stringify(questsPayload, null, 2) + "\n", "utf-8");
  const paths: WorldMapBundleSavedPaths = {
    main: WORLD_MAP_PATH!,
    npcs: npcsPath,
    quests: questsPath,
  };
  console.info("[biome-editor-server] World map bundle saved:\n  main: %s\n  npcs: %s\n  quests: %s", paths.main, paths.npcs, paths.quests);
  return paths;
}

export async function writeWorldMap(data: WorldMapData): Promise<WorldMapBundleSavedPaths> {
  ensureEditorAvailable();
  return writeWorldMapBundleToDisk(data);
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
  const mapDir = path.dirname(WORLD_MAP_PATH!);
  const npcsParsed = await tryReadWorldMapSidecar(path.join(mapDir, WORLD_MAP_NPCS_FILENAME));
  const questsParsed = await tryReadWorldMapSidecar(path.join(mapDir, WORLD_MAP_QUESTS_FILENAME));
  const merged = mergeWorldMapMainWithSidecars(data, npcsParsed, questsParsed);
  const editorMeta = parseDialogueNpcEditorMetadataFromQuestsSidecar(questsParsed);
  let mergedDialogue = merged.dialogueNpcs;
  if (editorMeta.length > 0) {
    mergedDialogue = applyDialogueNpcEditorMetadataToRawDialogueNpcs(
      mergedDialogue,
      editorMeta,
    ) as WorldMapData["dialogueNpcs"];
  }
  const dataWithSidecars: Partial<WorldMapData> = {
    ...data,
    dialogueNpcs: mergedDialogue,
    quests: merged.quests as WorldMapData["quests"],
  };
  const oldN = dataWithSidecars.ground!.length;
  if (
    dataWithSidecars.collidables!.length !== oldN ||
    dataWithSidecars.ground!.some((row) => row.length !== oldN) ||
    dataWithSidecars.collidables!.some((row) => row.length !== oldN)
  ) {
    throw new Error("World map ground/collidables must be square and matching dimensions");
  }
  let spawns = dataWithSidecars.spawns;
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
  let decals = dataWithSidecars.decals;
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
  const dialogueNpcs = normalizeDialogueNpcs(dataWithSidecars.dialogueNpcs, oldN);
  rewriteSpawnsLayerDialogueNpcTiles(spawns, dialogueNpcs);
  const messageDecals = reconcileMessageDecalsWithDecalsLayer(
    decals,
    dataWithSidecars.messageDecals,
    oldN,
  );
  const quests = normalizeQuests(dataWithSidecars.quests, oldN);
  const spawnerMeta = reconcileSpawnerMetaWithSpawnsLayer(spawns, dataWithSidecars.spawnerMeta);
  const merchantMeta = reconcileMerchantMetaWithMerchantTiles(
    decals,
    dataWithSidecars.collidables!,
    dataWithSidecars.merchantMeta,
    oldN,
  );
  return {
    ground: dataWithSidecars.ground!,
    collidables: dataWithSidecars.collidables!,
    spawns,
    decals,
    dialogueNpcs,
    messageDecals,
    quests,
    spawnerMeta,
    merchantMeta,
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
 * Expands the world map (top-left anchored padding), updates the world map bundle on disk
 * (`world-map.json` + NPC/quest sidecars) and MAP_SIZE in world-config.ts.
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
    messageDecals: reconcileMessageDecalsWithDecalsLayer(
      resized.decals,
      raw.messageDecals ?? [],
      newN,
    ),
    quests: raw.quests ?? [],
    spawnerMeta: reconcileSpawnerMetaWithSpawnsLayer(resized.spawns, raw.spawnerMeta),
    merchantMeta: reconcileMerchantMetaWithMerchantTiles(
      resized.decals,
      resized.collidables,
      raw.merchantMeta,
      newN,
    ),
  };

  const previousConfigText = await fs.readFile(WORLD_CONFIG_PATH, "utf-8");

  await patchWorldConfigMapSize(mapSizeBiomes);

  try {
    const err = validateDimensions(expanded);
    if (err) {
      throw new Error(err);
    }
    await writeWorldMapBundleToDisk(expanded);
  } catch (e) {
    await fs.writeFile(WORLD_CONFIG_PATH, previousConfigText, "utf-8");
    throw e;
  }

  return { mapSizeBiomes, tileSize: newN };
}
