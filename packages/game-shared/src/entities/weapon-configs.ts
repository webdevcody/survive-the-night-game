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
    },
    assets: {
      assetPrefix: "knife",
      spritePositions: {
        right: { x: 17, y: 171 },
        down: { x: 51, y: 171 },
        up: { x: 34, y: 171 },
      },
      sheet: "default",
    },
    sound: "knife_swing",
    spawn: {
      enabled: true,
      chance: 0.003,
    },
  },
  baseball_bat: {
    id: "baseball_bat",
    type: "melee",
    stats: {
      damage: 2,
      pushDistance: 12,
      cooldown: 0.8,
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
  },
  pistol: {
    id: "pistol",
    type: "ranged",
    stats: {
      cooldown: 0.3,
      recoilKnockback: 80,
    },
    assets: {
      assetPrefix: "pistol",
      spritePositions: {
        right: { x: 17, y: 149 },
        down: { x: 51, y: 149 },
        up: { x: 34, y: 149 },
      },
      sheet: "default",
    },
    sound: "pistol",
    spawn: {
      enabled: true,
      chance: 0.002,
    },
  },
  shotgun: {
    id: "shotgun",
    type: "ranged",
    stats: {
      spreadAngle: 8,
      cooldown: 0.8,
      recoilKnockback: 220,
    },
    assets: {
      assetPrefix: "shotgun",
      spritePositions: {
        right: { x: 17, y: 133 },
        down: { x: 51, y: 133 },
        up: { x: 34, y: 133 },
      },
      sheet: "default",
    },
    sound: "shotgun_fire",
    spawn: {
      enabled: true,
      chance: 0.0015,
    },
  },
  bolt_action_rifle: {
    id: "bolt_action_rifle",
    type: "ranged",
    stats: {
      cooldown: 2.0,
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
    spawn: {
      enabled: true,
      chance: 0.0015,
    },
  },
  ak47: {
    id: "ak47",
    type: "ranged",
    stats: {
      cooldown: 0.08,
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
    spawn: {
      enabled: true,
      chance: 0.0015,
    },
  },
  grenade_launcher: {
    id: "grenade_launcher",
    type: "ranged",
    stats: {
      cooldown: 1.0,
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
  },
  flamethrower: {
    id: "flamethrower",
    type: "ranged",
    stats: {
      cooldown: 0.1, // Very fast cooldown for continuous fire
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
  },
  bow: {
    id: "bow",
    type: "ranged",
    stats: {
      cooldown: 0.6,
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
    spawn: {
      enabled: true,
      chance: 0.002,
    },
  },
};
