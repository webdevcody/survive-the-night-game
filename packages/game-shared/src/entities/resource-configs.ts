import { ResourceConfig } from "./resource-registry";

export const RESOURCE_CONFIGS: Record<string, ResourceConfig> = {
  wood: {
    id: "wood",
    assets: {
      assetKey: "wood",
      x: 64,
      y: 32,
      sheet: "items",
    },
    spawn: {
      enabled: true,
      chance: 0.1,
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 2,
    },
  },
  cloth: {
    id: "cloth",
    assets: {
      assetKey: "cloth",
      x: 128,
      y: 0,
      sheet: "items",
    },
    spawn: {
      enabled: true,
      chance: 0.1,
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 4,
    },
  },
};

