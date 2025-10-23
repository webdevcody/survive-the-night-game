import { EnvironmentConfig } from "./environment-registry";

export const ENVIRONMENT_CONFIGS: Record<string, EnvironmentConfig> = {
  tree: {
    id: "tree",
    category: "resource",
    assets: {
      assetKey: "tree",
      x: 221,
      y: 209,
      sheet: "default",
    },
  },
  wood: {
    id: "wood",
    category: "resource",
    assets: {
      assetKey: "wood",
      x: 221,
      y: 209,
      sheet: "default",
    },
  },
  wall: {
    id: "wall",
    category: "structure",
    assets: {
      assetKey: "wall",
      x: 357,
      y: 95,
      sheet: "default",
    },
  },
};
