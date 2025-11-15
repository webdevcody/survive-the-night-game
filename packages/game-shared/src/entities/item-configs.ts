import { ItemConfig } from "./item-registry";

export const ITEM_CONFIGS: Record<string, ItemConfig> = {
  bandage: {
    id: "bandage",
    category: "consumable",
    assets: {
      assetKey: "bandage",
      x: 48,
      y: 48,
      sheet: "items",
    },
    spawn: {
      enabled: true,
      chance: 0.005,
    },
    merchant: {
      enabled: true,
      price: 10,
    },
    recipe: {
      enabled: true,
      components: [{ type: "cloth", count: 3 }],
    },
  },
  cloth: {
    id: "cloth",
    category: "consumable",
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
      price: 4,
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
    spawn: {
      enabled: true,
      chance: 0.005,
    },
    merchant: {
      enabled: true,
      price: 8,
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
    spawn: {
      enabled: true,
      chance: 0.005,
    },
    merchant: {
      enabled: true,
      price: 12,
    },
  },
  bolt_action_ammo: {
    id: "bolt_action_ammo",
    category: "ammo",
    assets: {
      assetKey: "bolt_action_ammo",
      x: 96,
      y: 16,
      sheet: "items",
    },
    spawn: {
      enabled: true,
      chance: 0.005,
    },
  },
  ak47_ammo: {
    id: "ak47_ammo",
    category: "ammo",
    assets: {
      assetKey: "ak47_ammo",
      x: 112,
      y: 16,
      sheet: "items",
    },
    spawn: {
      enabled: true,
      chance: 0.005,
    },
  },
  grenade_launcher_ammo: {
    id: "grenade_launcher_ammo",
    category: "ammo",
    assets: {
      assetKey: "grenade_launcher_ammo",
      x: 112,
      y: 16,
      sheet: "items",
    },
  },
  flamethrower_ammo: {
    id: "flamethrower_ammo",
    category: "ammo",
    assets: {
      assetKey: "flamethrower_ammo",
      x: 112,
      y: 16,
      sheet: "items",
    },
  },
  landmine: {
    id: "landmine",
    category: "placeable",
    placeable: true,
    assets: {
      assetKey: "landmine",
      x: 16,
      y: 48,
      sheet: "items",
    },
    spawn: {
      enabled: true,
      chance: 0.001,
    },
    merchant: {
      enabled: true,
      price: 20,
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
    spawn: {
      enabled: false,
      chance: 0,
    },
    merchant: {
      enabled: true,
      price: 20,
    },
  },
  torch: {
    id: "torch",
    category: "placeable",
    placeable: true,
    assets: {
      assetKey: "torch",
      x: 68,
      y: 266,
    },
    spawn: {
      enabled: false,
      chance: 0, // do not spawn torches, players must craft them
    },
    merchant: {
      enabled: true,
      price: 5,
    },
    recipe: {
      enabled: true,
      components: [{ type: "wood" }, { type: "cloth" }],
    },
  },
  gasoline: {
    id: "gasoline",
    category: "placeable",
    placeable: true,
    assets: {
      assetKey: "gasoline",
      x: 255,
      y: 38,
    },
    spawn: {
      enabled: true,
      chance: 0.002,
    },
    merchant: {
      enabled: true,
      price: 10,
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
  crate: {
    id: "crate",
    category: "structure",
    assets: {
      assetKey: "crate",
      x: 0,
      y: 144,
      sheet: "items",
      totalFrames: 3,
    },
  },
  miners_hat: {
    id: "miners_hat",
    category: "consumable",
    assets: {
      assetKey: "miners_hat",
      x: 48,
      y: 144,
      sheet: "items",
    },
    hideWhenSelected: true, // Don't show overlay when selected since player is wearing it
    spawn: {
      enabled: true,
      chance: 0.0001,
    },
  },
  spikes: {
    id: "spikes",
    category: "placeable",
    placeable: true,
    placeSound: "build",
    assets: {
      assetKey: "spikes",
      x: 357,
      y: 57,
      sheet: "default",
    },
    spawn: {
      enabled: true,
      chance: 0.003,
    },
    recipe: {
      enabled: true,
      components: [{ type: "knife" }, { type: "wood", count: 2 }],
    },
  },
  bear_trap: {
    id: "bear_trap",
    category: "structure",
    placeable: true,
    assets: {
      assetKey: "bear_trap",
      x: 64,
      y: 144,
      sheet: "items",
    },
    spawn: {
      enabled: true,
      chance: 0.002,
    },
    recipe: {
      enabled: true,
      components: [{ type: "knife" }, { type: "wood", count: 3 }, { type: "cloth", count: 1 }],
    },
  },
  wall: {
    id: "wall",
    category: "structure",
    placeable: true,
    placeSound: "build",
    assets: {
      assetKey: "wall",
      x: 64,
      y: 48,
      sheet: "items",
    },
    spawn: {
      enabled: true,
      chance: 0.005,
    },
    recipe: {
      enabled: true,
      components: [{ type: "wood", count: 2 }],
    },
  },
  // Tree is special - it's in environment-configs but spawns like an item
  // Entity type is "tree" but we reference it here for spawn config
  tree: {
    id: "tree",
    category: "structure",
    assets: {
      assetKey: "tree",
      x: 144,
      y: 0,
      sheet: "items",
    },
    spawn: {
      enabled: true,
      chance: 0.2,
    },
  },
  sentry_gun: {
    id: "sentry_gun",
    category: "structure",
    placeable: true,
    placeSound: "build",
    assets: {
      assetKey: "sentry_gun",
      x: 80,
      y: 144,
      sheet: "items",
    },
    recipe: {
      enabled: true,
      components: [
        { type: "pistol" },
        { type: "pistol_ammo", count: 5 },
        { type: "wood", count: 3 },
        { type: "cloth", count: 2 },
      ],
    },
  },
};
