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
      sheet: "ground",
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
      sheet: "ground",
    },
  },
  fire: {
    id: "fire",
    category: "obstacle",
    assets: {
      assetKey: "fire",
      x: 0,
      y: 80,
      sheet: "items",
      totalFrames: 5, // 5 animation frames for fire
    },
  },
  campsite_fire: {
    id: "campsite_fire",
    category: "obstacle",
    assets: {
      // Note: CampsiteFire entity uses animated campfire frames from ground sheet
      // Client renders using imageLoader.getFrameIndex("campsite_fire", frameIndex)
      assetKey: "campsite_fire",
      x: 0, // Start position matches campfire decal animated frames
      y: 272,
      sheet: "ground",
      totalFrames: 5, // 5 animation frames for campfire
    },
  },
};
