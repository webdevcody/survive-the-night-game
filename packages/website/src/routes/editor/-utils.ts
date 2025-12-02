// Constants
export const BIOME_SIZE = 16;

// Initialize empty ground layer (16x16 grid of zeros)
export const createEmptyGroundLayer = (): number[][] => {
  return Array(BIOME_SIZE)
    .fill(0)
    .map(() => Array(BIOME_SIZE).fill(0));
};

// Initialize empty collidables layer (16x16 grid of -1, meaning no collision)
export const createEmptyCollidablesLayer = (): number[][] => {
  return Array(BIOME_SIZE)
    .fill(0)
    .map(() => Array(BIOME_SIZE).fill(-1));
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
export const getLayerImage = (layer: "ground" | "collidables") => {
  return layer === "ground" ? "/sheets/ground.png" : "/sheets/collidables.png";
};
