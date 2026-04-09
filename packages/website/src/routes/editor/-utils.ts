import { getConfig } from "@survive-the-night/game-shared/config";

/** Full world width/height in tiles (MAP_SIZE biomes × BIOME_SIZE tiles each). */
export function getFullMapTileCount(): number {
  const { BIOME_SIZE, MAP_SIZE } = getConfig().world;
  return BIOME_SIZE * MAP_SIZE;
}

/** Prefer loaded grid size so the editor stays correct when map dimensions differ from bundled config (e.g. after expand, before HMR). */
export function getMapSideLength(groundGrid: number[][]): number {
  return groundGrid.length > 0 ? groundGrid.length : getFullMapTileCount();
}

export const getTilePixelSize = () => getConfig().world.TILE_SIZE * 2;

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
