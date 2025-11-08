/**
 * Decals Configuration
 *
 * Decals are decorative animated sprites that render above the ground layer
 * but below collidables. They use the ground.png sprite sheet.
 */

export interface AnimatedDecalConfig {
  /** Starting X coordinate in sprite sheet (pixels) */
  startX: number;
  /** Starting Y coordinate in sprite sheet (pixels) */
  startY: number;
  /** Number of animation frames */
  frameCount: number;
  /** Total animation duration in milliseconds */
  duration: number;
  /** Width of each frame in pixels (default: 16) */
  frameWidth?: number;
  /** Height of each frame in pixels (default: 16) */
  frameHeight?: number;
}

export interface DecalLightConfig {
  /** Light radius in pixels */
  radius: number;
  /** Optional: Light intensity multiplier (0-1, default: 1) */
  intensity?: number;
}

export interface DecalData {
  /** Unique identifier for the decal type */
  id: string;
  /** Position in the biome grid (0-15 for x and y) */
  position: {
    x: number;
    y: number;
  };
  /** Animation configuration (optional for static decals) */
  animation?: AnimatedDecalConfig;
  /** Light emission configuration (optional) */
  light?: DecalLightConfig;
}

export interface DecalPreset {
  /** Unique identifier */
  id: string;
  /** Display name in editor */
  name: string;
  /** Description for tooltip */
  description: string;
  /** Animation configuration */
  animation: AnimatedDecalConfig;
  /** Light emission configuration (optional) */
  light?: DecalLightConfig;
}

/**
 * Registry of preset decals available in the editor
 */
export const DECAL_REGISTRY: Record<string, DecalPreset> = {
  campfire: {
    id: "campfire",
    name: "Campfire",
    description: "Animated campfire with flickering flames",
    animation: {
      startX: 0,
      startY: 272,
      frameCount: 5,
      duration: 1000, // 1 second for full animation cycle
      frameWidth: 16,
      frameHeight: 16,
    },
    light: {
      radius: 140, // Light radius in pixels
      intensity: 1.0,
    },
  },
};

/**
 * Helper function to get tile ID from sprite sheet coordinates
 * Assumes 16x16 tiles and sprite sheet width of 16 tiles (256 pixels)
 */
export function getTileIdFromCoords(x: number, y: number): number {
  const TILE_SIZE = 16;
  const SHEET_WIDTH_TILES = 16;

  const tileX = Math.floor(x / TILE_SIZE);
  const tileY = Math.floor(y / TILE_SIZE);

  return tileY * SHEET_WIDTH_TILES + tileX;
}

/**
 * Helper function to get sprite sheet coordinates from tile ID
 */
export function getCoordsFromTileId(tileId: number): { x: number; y: number } {
  const TILE_SIZE = 16;
  const SHEET_WIDTH_TILES = 16;

  const tileX = tileId % SHEET_WIDTH_TILES;
  const tileY = Math.floor(tileId / SHEET_WIDTH_TILES);

  return {
    x: tileX * TILE_SIZE,
    y: tileY * TILE_SIZE,
  };
}
