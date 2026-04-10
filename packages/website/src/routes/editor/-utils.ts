import { getConfig } from "@survive-the-night/game-shared/config";
import type { WorldMapDialogueNpcEntry } from "@survive-the-night/game-shared/map/world-map-types";
import { normalizeDialogueNpcs } from "@survive-the-night/game-shared/map/world-map-types";
import { NPC_DIALOGUE_SURVIVOR_SPAWN_TILE_ID } from "@survive-the-night/game-shared/map/spawn-palette";

/** Full world width/height in tiles (MAP_SIZE biomes × BIOME_SIZE tiles each). */
export function getFullMapTileCount(): number {
  const { BIOME_SIZE, MAP_SIZE } = getConfig().world;
  return BIOME_SIZE * MAP_SIZE;
}

/** Prefer loaded grid size so the editor stays correct when map dimensions differ from bundled config (e.g. after expand, before HMR). */
export function getMapSideLength(groundGrid: number[][]): number {
  return groundGrid.length > 0 ? groundGrid.length : getFullMapTileCount();
}

/** Default on-screen tile size (CSS px) for the main map canvas; pinch zoom scales this. */
export const DEFAULT_EDITOR_TILE_PIXEL_SIZE = getConfig().world.TILE_SIZE * 2;

export const getTilePixelSize = () => DEFAULT_EDITOR_TILE_PIXEL_SIZE;

export const createEmptyGroundLayer = (size: number): number[][] => {
  return Array(size)
    .fill(0)
    .map(() => Array(size).fill(0));
};

export const createEmptyCollidablesLayer = (size: number): number[][] => {
  return Array(size)
    .fill(0)
    .map(() => Array(size).fill(-1));
};

export const createEmptySpawnsLayer = (size: number): number[][] => {
  return Array(size)
    .fill(0)
    .map(() => Array(size).fill(0));
};

export const createEmptyDecalsLayer = (size: number): number[][] => {
  return Array(size)
    .fill(0)
    .map(() => Array(size).fill(0));
};

/**
 * Ensures every dialogue-NPC spawn tile has a `dialogueNpcs` entry (default message if missing).
 */
export function reconcileDialogueNpcsWithSpawnsLayer(
  spawns: number[][],
  rawDialogue: unknown,
): WorldMapDialogueNpcEntry[] {
  const n = spawns.length;
  const normalized = normalizeDialogueNpcs(rawDialogue, n);
  const byKey = new Map<string, string>();
  for (const e of normalized) {
    byKey.set(`${e.row},${e.col}`, e.message);
  }
  const out: WorldMapDialogueNpcEntry[] = [];
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (spawns[row][col] === NPC_DIALOGUE_SURVIVOR_SPAWN_TILE_ID) {
        const k = `${row},${col}`;
        out.push({ row, col, message: byKey.get(k) ?? "Hello!" });
      }
    }
  }
  return out;
}

// Convert name to kebab-case
export const toKebabCase = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
};

// Get the appropriate tilesheet image URL for the active layer
export const getLayerImage = (layer: "ground" | "collidables" | "spawns" | "decals") => {
  if (layer === "ground") return "/sheets/ground.png";
  if (layer === "collidables") return "/sheets/collidables.png";
  return "";
};
