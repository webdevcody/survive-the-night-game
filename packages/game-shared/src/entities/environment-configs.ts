import { EnvironmentConfig } from "./environment-registry";

export const ENVIRONMENT_CONFIGS: Record<string, EnvironmentConfig> = {
  tree: {
    id: "tree",
    category: "resource",
    assets: {
      assetKey: "tree",
      x: 144,
      y: 0,
      sheet: "items",
    },
  },
  wood: {
    id: "wood",
    category: "resource",
    assets: {
      assetKey: "wood",
      x: 64,
      y: 32,
      sheet: "items",
    },
  },
  wall: {
    id: "wall",
    category: "structure",
    assets: {
      assetKey: "wall",
      x: 64,
      y: 48,
      sheet: "items",
    },
  },
  sentry_gun: {
    id: "sentry_gun",
    category: "structure",
    assets: {
      assetKey: "sentry_gun",
      x: 17,
      y: 149,
      sheet: "default",
    },
  },
  car: {
    id: "car",
    category: "structure",
    assets: {
      // Note: Car uses /sheets/collidables.png sheet (not standard asset system)
      // Client renders directly from collidables sheet at x=16, y=352
      assetKey: "car",
      x: 16,
      y: 352,
      width: 32,
      height: 16,
      sheet: "collidables", // Special sheet, not auto-generated
    },
  },
  merchant: {
    id: "merchant",
    category: "obstacle",
    assets: {
      // Note: Merchant has no visible sprite - it's an interactive entity only
      // Spawned from tile ID 255 in collidables layer
      assetKey: "merchant",
      x: 0,
      y: 0,
      sheet: "default",
    },
  },
  boundary: {
    id: "boundary",
    category: "obstacle",
    assets: {
      // Note: Boundary is server-only entity, no client rendering needed
      assetKey: "boundary",
      x: 0,
      y: 0,
      sheet: "default",
    },
  },
  fire: {
    id: "fire",
    category: "obstacle",
    assets: {
      // Note: Fire entity uses animated "flame" frames from decal-configs
      // Client renders using imageLoader.getFrameIndex("flame", frameIndex)
      assetKey: "fire",
      x: 85, // Start position matches flame decal animated frames
      y: 266,
      sheet: "default",
    },
  },
};
