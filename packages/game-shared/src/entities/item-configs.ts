import { ItemConfig } from "./item-registry";

export const ITEM_CONFIGS: Record<string, ItemConfig> = {
  bandage: {
    id: "bandage",
    category: "consumable",
    assets: {
      assetKey: "bandage",
      x: 34,
      y: 190,
    },
  },
  cloth: {
    id: "cloth",
    category: "consumable",
    assets: {
      assetKey: "cloth",
      x: 51,
      y: 228,
    },
  },
  pistol_ammo: {
    id: "pistol_ammo",
    category: "ammo",
    assets: {
      assetKey: "pistol_ammo",
      x: 64,
      y: 16,
      sheet: "items",
    },
  },
  shotgun_ammo: {
    id: "shotgun_ammo",
    category: "ammo",
    assets: {
      assetKey: "shotgun_ammo",
      x: 80,
      y: 16,
      sheet: "items",
    },
  },
  landmine: {
    id: "landmine",
    category: "placeable",
    assets: {
      assetKey: "landmine",
      x: 16,
      y: 48,
      sheet: "items",
    },
  },
  grenade: {
    id: "grenade",
    category: "throwable",
    assets: {
      assetKey: "grenade",
      x: 64,
      y: 0,
      sheet: "items",
    },
  },
  fire_extinguisher: {
    id: "fire_extinguisher",
    category: "throwable",
    assets: {
      assetKey: "fire_extinguisher",
      x: 112,
      y: 0,
      sheet: "items",
    },
  },
  torch: {
    id: "torch",
    category: "placeable",
    assets: {
      assetKey: "torch",
      x: 68,
      y: 266,
    },
  },
  gasoline: {
    id: "gasoline",
    category: "placeable",
    assets: {
      assetKey: "gasoline",
      x: 255,
      y: 38,
    },
  },
  coin: {
    id: "coin",
    category: "consumable",
    assets: {
      assetKey: "coin",
      x: 32,
      y: 48,
      sheet: "items",
    },
  },
};
