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
};
