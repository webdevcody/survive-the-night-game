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
    healable: true,
    spawn: {
      enabled: true,
      chance: 0.005,
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 10,
    },
    recipe: {
      enabled: true,
      components: [{ type: "cloth", count: 3 }],
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
      buyable: true,
      price: 8,
      stackSize: 8,
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
      buyable: true,
      price: 12,
      stackSize: 8,
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
    merchant: {
      enabled: true,
      buyable: true,
      price: 15,
      stackSize: 10,
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
    merchant: {
      enabled: true,
      buyable: true,
      price: 10,
      stackSize: 30,
    },
  },
  grenade_launcher_ammo: {
    id: "grenade_launcher_ammo",
    category: "ammo",
    assets: {
      assetKey: "grenade_launcher_ammo",
      x: 128,
      y: 16,
      sheet: "items",
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 25,
      stackSize: 4,
    },
  },
  flamethrower_ammo: {
    id: "flamethrower_ammo",
    category: "ammo",
    assets: {
      assetKey: "flamethrower_ammo",
      x: 144,
      y: 16,
      sheet: "items",
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 20,
      stackSize: 30,
    },
  },
  arrow_ammo: {
    id: "arrow_ammo",
    category: "ammo",
    assets: {
      assetKey: "arrow_ammo",
      x: 128,
      y: 32,
      sheet: "items",
    },
    spawn: {
      enabled: true,
      chance: 0.005,
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 8,
      stackSize: 16,
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
      buyable: true,
      price: 20,
    },
    autoPickup: false,
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
      enabled: false,
      buyable: false,
      price: 20,
    },
  },
  torch: {
    id: "torch",
    category: "placeable",
    placeable: true,
    assets: {
      assetKey: "torch",
      x: 0,
      y: 0,
      sheet: "items",
    },
    spawn: {
      enabled: false,
      chance: 0, // do not spawn torches, players must craft them
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 5,
    },
    autoPickup: false,
    recipe: {
      enabled: true,
      components: [{ type: "wood" }, { type: "cloth" }],
    },
    lightIntensity: 300,
  },
  gasoline: {
    id: "gasoline",
    category: "placeable",
    placeable: true,
    assets: {
      assetKey: "gasoline",
      x: 0,
      y: 48,
      sheet: "items",
    },
    spawn: {
      enabled: true,
      chance: 0.002,
    },
    merchant: {
      enabled: true,
      buyable: true,
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
    autoPickup: true,
  },
  energy_drink: {
    id: "energy_drink",
    category: "consumable",
    assets: {
      assetKey: "energy_drink",
      x: 112,
      y: 144,
      sheet: "items",
    },
    spawn: {
      enabled: true,
      chance: 0.003,
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 15,
    },
    duration: 20, // Duration in seconds for unlimited running
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
    autoPickup: true,
  },
  gallon_drum: {
    id: "gallon_drum",
    category: "structure",
    assets: {
      assetKey: "gallon_drum",
      x: 96,
      y: 144,
      sheet: "items",
    },
    spawn: {
      enabled: true,
      chance: 0.03,
    },
    autoPickup: true,
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
    wearable: true, // Item is wearable and should be rendered as an overlay when in inventory
    spawn: {
      enabled: true,
      chance: 0.0001,
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 30,
    },
    lightIntensity: 200,
  },
  spikes: {
    id: "spikes",
    category: "placeable",
    placeable: true,
    placeSound: "build",
    assets: {
      assetKey: "spikes",
      x: 0,
      y: 16,
      sheet: "items",
    },
    spawn: {
      enabled: true,
      chance: 0.003,
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 15,
    },
    recipe: {
      enabled: true,
      components: [{ type: "wood", count: 4 }],
    },
    upgradeTo: "spikes_level_2",
    autoPickup: false,
  },
  spikes_level_2: {
    id: "spikes_level_2",
    category: "placeable",
    placeable: true,
    placeSound: "build",
    assets: {
      assetKey: "spikes_level_2",
      x: 128,
      y: 128,
      sheet: "items",
    },
    spawn: {
      enabled: false,
      chance: 0,
    },
    merchant: {
      enabled: false,
      buyable: false,
      price: 0,
    },
    upgradeTo: "spikes_level_3",
    autoPickup: false,
  },
  spikes_level_3: {
    id: "spikes_level_3",
    category: "placeable",
    placeable: true,
    placeSound: "build",
    assets: {
      assetKey: "spikes_level_3",
      x: 128,
      y: 144,
      sheet: "items",
    },
    spawn: {
      enabled: false,
      chance: 0,
    },
    merchant: {
      enabled: false,
      buyable: false,
      price: 0,
    },
    autoPickup: false,
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
    merchant: {
      enabled: true,
      buyable: true,
      price: 25,
    },
    recipe: {
      enabled: true,
      components: [
        { type: "wood", count: 3 },
        { type: "cloth", count: 1 },
      ],
    },
    autoPickup: false,
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
    merchant: {
      enabled: true,
      buyable: true,
      price: 8,
    },
    recipe: {
      enabled: true,
      components: [{ type: "wood", count: 2 }],
    },
    upgradeTo: "wall_level_2",
    autoPickup: false,
    isPassthrough: true,
  },
  wall_level_2: {
    id: "wall_level_2",
    category: "structure",
    placeable: true,
    placeSound: "build",
    assets: {
      assetKey: "wall_level_2",
      x: 144,
      y: 64,
      sheet: "items",
    },
    spawn: {
      enabled: false,
      chance: 0,
    },
    merchant: {
      enabled: false,
      buyable: false,
      price: 0,
    },
    upgradeTo: "wall_level_3",
    autoPickup: false,
    isPassthrough: true,
  },
  wall_level_3: {
    id: "wall_level_3",
    category: "structure",
    placeable: true,
    placeSound: "build",
    assets: {
      assetKey: "wall_level_3",
      x: 144,
      y: 80,
      sheet: "items",
    },
    spawn: {
      enabled: false,
      chance: 0,
    },
    merchant: {
      enabled: false,
      buyable: false,
      price: 0,
    },
    autoPickup: false,
    isPassthrough: true,
  },
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
    merchant: {
      enabled: true,
      buyable: true,
      price: 100,
    },
    recipe: {
      enabled: true,
      components: [
        { type: "pistol" },
        { type: "pistol_ammo", count: 8 },
        { type: "wood", count: 3 },
        { type: "cloth", count: 2 },
      ],
    },
    upgradeTo: "sentry_gun_level_2",
    autoPickup: false,
    isPassthrough: true,
  },
  sentry_gun_level_2: {
    id: "sentry_gun_level_2",
    category: "structure",
    placeable: true,
    placeSound: "build",
    assets: {
      assetKey: "sentry_gun_level_2",
      x: 144,
      y: 128,
      sheet: "items",
    },
    spawn: {
      enabled: false,
      chance: 0,
    },
    merchant: {
      enabled: false,
      buyable: false,
      price: 0,
    },
    upgradeTo: "sentry_gun_level_3",
    autoPickup: false,
    isPassthrough: true,
  },
  sentry_gun_level_3: {
    id: "sentry_gun_level_3",
    category: "structure",
    placeable: true,
    placeSound: "build",
    assets: {
      assetKey: "sentry_gun_level_3",
      x: 144,
      y: 144,
      sheet: "items",
    },
    spawn: {
      enabled: false,
      chance: 0,
    },
    merchant: {
      enabled: false,
      buyable: false,
      price: 0,
    },
    autoPickup: false,
    isPassthrough: true,
  },
};
