import { WeaponConfig } from "./weapon-registry";

// Use string literals instead of types to avoid circular dependency with Entities
export const WEAPON_CONFIGS: Record<string, WeaponConfig> = {
  knife: {
    id: "knife",
    type: "melee",
    stats: {
      damage: 1,
      pushDistance: 12,
      cooldown: 0.5,
      cameraShakeIntensity: 0.35,
    },
    assets: {
      assetPrefix: "knife",
      spritePositions: {
        right: { x: 16, y: 32 },
        down: { x: 48, y: 32 },
        up: { x: 32, y: 32 },
      },
      sheet: "items",
    },
    sound: "knife_swing",
    spawn: {
      enabled: true,
      chance: 0.003,
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 15,
    },
  },
  baseball_bat: {
    id: "baseball_bat",
    type: "melee",
    stats: {
      damage: 2,
      pushDistance: 12,
      cooldown: 0.8,
      cameraShakeIntensity: 0.45,
    },
    assets: {
      assetPrefix: "baseball_bat",
      spritePositions: {
        right: { x: 80, y: 32 },
        down: { x: 112, y: 32 },
        up: { x: 96, y: 32 },
      },
      sheet: "items",
    },
    sound: "knife_swing",
    spawn: {
      enabled: true,
      chance: 0.003,
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 20,
    },
  },
  pistol: {
    id: "pistol",
    type: "ranged",
    stats: {
      cooldown: 0.3,
      recoilKnockback: 80,
      cameraShakeIntensity: 1.1,
    },
    assets: {
      assetPrefix: "pistol",
      spritePositions: {
        right: { x: 16, y: 16 },
        down: { x: 16, y: 16 },
        up: { x: 16, y: 16 },
      },
      sheet: "items",
    },
    sound: "pistol",
    ammoType: "pistol_ammo",
    spawn: {
      enabled: true,
      chance: 0.002,
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 50,
    },
  },
  shotgun: {
    id: "shotgun",
    type: "ranged",
    stats: {
      spreadAngle: 8,
      cooldown: 0.8,
      recoilKnockback: 220,
      cameraShakeIntensity: 2.6,
    },
    assets: {
      assetPrefix: "shotgun",
      spritePositions: {
        right: { x: 0, y: 64 },
        down: { x: 16, y: 64 },
        up: { x: 32, y: 64 },
      },
      sheet: "items",
    },
    sound: "shotgun_fire",
    ammoType: "shotgun_ammo",
    spawn: {
      enabled: true,
      chance: 0.0015,
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 75,
    },
  },
  bolt_action_rifle: {
    id: "bolt_action_rifle",
    type: "ranged",
    stats: {
      cooldown: 2.0,
      cameraShakeIntensity: 1.4,
    },
    assets: {
      assetPrefix: "bolt_action_rifle",
      spritePositions: {
        right: { x: 0, y: 64 },
        up: { x: 16, y: 64 },
        down: { x: 32, y: 64 },
      },
      sheet: "items",
    },
    sound: "pistol",
    ammoType: "bolt_action_ammo",
    spawn: {
      enabled: true,
      chance: 0.0015,
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 100,
    },
  },
  ak47: {
    id: "ak47",
    type: "ranged",
    stats: {
      cooldown: 0.08,
      cameraShakeIntensity: 1.0,
    },
    assets: {
      assetPrefix: "ak47",
      spritePositions: {
        right: { x: 80, y: 96 },
        up: { x: 96, y: 96 },
        down: { x: 112, y: 96 },
      },
      sheet: "items",
    },
    sound: "pistol",
    ammoType: "ak47_ammo",
    spawn: {
      enabled: true,
      chance: 0.0015,
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 150,
    },
  },
  grenade_launcher: {
    id: "grenade_launcher",
    type: "ranged",
    stats: {
      cooldown: 1.0,
      cameraShakeIntensity: 2.8,
    },
    assets: {
      assetPrefix: "grenade_launcher",
      spritePositions: {
        right: { x: 96, y: 64 },
        up: { x: 112, y: 64 },
        down: { x: 128, y: 64 },
      },
      sheet: "items",
    },
    sound: "pistol",
    ammoType: "grenade_launcher_ammo",
    merchant: {
      enabled: true,
      buyable: true,
      price: 200,
    },
  },
  flamethrower: {
    id: "flamethrower",
    type: "ranged",
    stats: {
      cooldown: 0.1, // Very fast cooldown for continuous fire
      cameraShakeIntensity: 0.9,
    },
    assets: {
      assetPrefix: "flamethrower",
      spritePositions: {
        right: { x: 96, y: 80 },
        up: { x: 112, y: 80 },
        down: { x: 128, y: 80 },
      },
      sheet: "items",
    },
    sound: "pistol", // Will use pistol sound until we have a flamethrower sound
    ammoType: "flamethrower_ammo",
    merchant: {
      enabled: true,
      buyable: true,
      price: 180,
    },
  },
  bow: {
    id: "bow",
    type: "ranged",
    stats: {
      cooldown: 0.6,
      cameraShakeIntensity: 0.8,
    },
    assets: {
      assetPrefix: "bow",
      spritePositions: {
        right: { x: 80, y: 112 },
        up: { x: 96, y: 112 },
        down: { x: 112, y: 112 },
      },
      sheet: "items",
    },
    sound: "pistol",
    ammoType: "arrow_ammo", // Bow uses arrow_ammo instead of bow_ammo
    spawn: {
      enabled: true,
      chance: 0.002,
    },
    merchant: {
      enabled: true,
      buyable: true,
      price: 40,
    },
  },
  grenade: {
    id: "grenade",
    type: "ranged",
    stats: {
      cooldown: 0.5,
      cameraShakeIntensity: 0.5,
    },
    assets: {
      assetPrefix: "grenade",
      spritePositions: {
        right: { x: 64, y: 0 },
        up: { x: 64, y: 0 },
        down: { x: 64, y: 0 },
      },
      sheet: "items",
    },
    sound: "pistol",
    merchant: {
      enabled: true,
      buyable: true,
      price: 20,
    },
  },
  molotov_cocktail: {
    id: "molotov_cocktail",
    type: "ranged",
    stats: {
      cooldown: 0.5,
      cameraShakeIntensity: 0.5,
    },
    assets: {
      assetPrefix: "molotov_cocktail",
      spritePositions: {
        right: { x: 144, y: 32 },
        up: { x: 144, y: 32 },
        down: { x: 144, y: 32 },
      },
      sheet: "items",
    },
    sound: "pistol",
    merchant: {
      enabled: true,
      buyable: true,
      price: 25,
    },
    recipe: {
      enabled: true,
      components: [{ type: "gasoline" }, { type: "cloth" }],
      resultCount: 2,
    },
  },
  throwing_knife: {
    id: "throwing_knife",
    type: "ranged",
    stats: {
      cooldown: 0.5,
      cameraShakeIntensity: 0.5,
    },
    assets: {
      assetPrefix: "throwing_knife",
      spritePositions: {
        right: { x: 80, y: 48 },
        down: { x: 80, y: 48 },
        up: { x: 80, y: 48 },
      },
      sheet: "items",
    },
    sound: "knife_swing",
    merchant: {
      enabled: true,
      buyable: true,
      price: 20,
    },
    recipe: {
      enabled: true,
      components: [{ type: "knife" }, { type: "cloth" }],
      resultCount: 5,
    },
  },
};
