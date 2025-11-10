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
  bolt_action_ammo: {
    id: "bolt_action_ammo",
    category: "ammo",
    assets: {
      assetKey: "bolt_action_ammo",
      x: 96,
      y: 16,
      sheet: "items",
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
  },
};
