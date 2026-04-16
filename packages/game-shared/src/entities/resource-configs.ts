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
  scrap_metal: {
    id: "scrap_metal",
    assets: {
      assetKey: "scrap_metal",
      x: 16,
      y: 160,
      sheet: "items",
    },
    spawn: {
      enabled: true,
      chance: 0.035,
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 5,
    },
  },
  mechanical_parts: {
    id: "mechanical_parts",
    assets: {
      assetKey: "mechanical_parts",
      x: 32,
      y: 160,
      sheet: "items",
    },
    spawn: {
      enabled: true,
      chance: 0.025,
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 7,
    },
  },
  gun_parts: {
    id: "gun_parts",
    assets: {
      assetKey: "gun_parts",
      x: 48,
      y: 160,
      sheet: "items",
    },
    spawn: {
      enabled: true,
      chance: 0.02,
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 9,
    },
  },
  electronics: {
    id: "electronics",
    assets: {
      assetKey: "electronics",
      x: 64,
      y: 160,
      sheet: "items",
    },
    spawn: {
      enabled: true,
      chance: 0.018,
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 10,
    },
  },
  chemical_reagents: {
    id: "chemical_reagents",
    assets: {
      assetKey: "chemical_reagents",
      x: 80,
      y: 160,
      sheet: "items",
    },
    spawn: {
      enabled: true,
      chance: 0.02,
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 8,
    },
  },
  leather_strips: {
    id: "leather_strips",
    assets: {
      assetKey: "leather_strips",
      x: 96,
      y: 160,
      sheet: "items",
    },
    spawn: {
      enabled: true,
      chance: 0.03,
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 6,
    },
  },
  canned_food: {
    id: "canned_food",
    assets: {
      assetKey: "canned_food",
      x: 112,
      y: 160,
      sheet: "items",
    },
    spawn: {
      enabled: true,
      chance: 0.03,
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 6,
    },
  },
  wild_herbs: {
    id: "wild_herbs",
    assets: {
      assetKey: "wild_herbs",
      x: 128,
      y: 160,
      sheet: "items",
    },
    spawn: {
      enabled: true,
      chance: 0.03,
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 4,
    },
  },
  clean_water: {
    id: "clean_water",
    quickSlotConsumable: true,
    assets: {
      assetKey: "clean_water",
      x: 144,
      y: 160,
      sheet: "items",
    },
    spawn: {
      enabled: true,
      chance: 0.03,
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 4,
    },
    recipe: {
      enabled: true,
      components: [{ type: "dirty_water", count: 1 }],
      resultCount: 1,
      profession: "cooking",
      unlockLevel: 1,
      station: "campfire",
      professionXp: 4,
    },
  },
  scrap_metal_bundle: {
    id: "scrap_metal_bundle",
    assets: {
      assetKey: "scrap_metal_bundle",
      x: 0,
      y: 176,
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
  },
  parts_bundle: {
    id: "parts_bundle",
    assets: {
      assetKey: "parts_bundle",
      x: 16,
      y: 176,
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
  },
  gun_parts_bundle: {
    id: "gun_parts_bundle",
    assets: {
      assetKey: "gun_parts_bundle",
      x: 32,
      y: 176,
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
  },
  electronics_bundle: {
    id: "electronics_bundle",
    assets: {
      assetKey: "electronics_bundle",
      x: 48,
      y: 176,
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
  },
  paper: {
    id: "paper",
    assets: {
      assetKey: "paper",
      x: 96,
      y: 208,
      sheet: "items",
    },
    spawn: {
      enabled: false,
      chance: 0,
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 2,
    },
    recipe: {
      enabled: true,
      components: [{ type: "cloth", count: 1 }],
      resultCount: 2,
      profession: "crafting",
      unlockLevel: 1,
      station: "workbench",
      professionXp: 4,
    },
  },
  dirty_water: {
    id: "dirty_water",
    assets: {
      assetKey: "dirty_water",
      x: 160,
      y: 160,
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
  },
  zombie_skin: {
    id: "zombie_skin",
    interactableDisplayName: "zombie skin",
    assets: {
      assetKey: "zombie_skin",
      x: 0,
      y: 240,
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
  },
  leather: {
    id: "leather",
    interactableDisplayName: "leather",
    assets: {
      assetKey: "leather",
      x: 96,
      y: 160,
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
    recipe: {
      enabled: true,
      components: [{ type: "zombie_skin", count: 2 }],
      resultCount: 1,
      profession: "tailoring",
      unlockLevel: 1,
      station: "workbench",
      professionXp: 6,
    },
  },
};
