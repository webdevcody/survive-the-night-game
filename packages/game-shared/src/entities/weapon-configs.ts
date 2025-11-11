import { WeaponConfig } from "./weapon-registry";

// Use string literals instead of WEAPON_TYPES to avoid circular dependency with Entities
export const WEAPON_CONFIGS: Record<string, WeaponConfig> = {
  knife: {
    id: "knife",
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
  pistol: {
    id: "pistol",
    stats: {
      cooldown: 0.3,
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
    stats: {
      spreadAngle: 8,
      cooldown: 0.8,
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
    stats: {
      cooldown: 0.08,
    },
    assets: {
      assetPrefix: "ak47",
      spritePositions: {
        right: { x: 48, y: 64 },
        up: { x: 64, y: 64 },
        down: { x: 80, y: 64 },
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
    stats: {
      cooldown: 1.0,
    },
    assets: {
      assetPrefix: "grenade_launcher",
      spritePositions: {
        right: { x: 48, y: 64 },
        up: { x: 64, y: 64 },
        down: { x: 80, y: 64 },
      },
      sheet: "items",
    },
    sound: "pistol",
  },
  flamethrower: {
    id: "flamethrower",
    stats: {
      cooldown: 0.1, // Very fast cooldown for continuous fire
    },
    assets: {
      assetPrefix: "flamethrower",
      spritePositions: {
        right: { x: 48, y: 64 },
        up: { x: 64, y: 64 },
        down: { x: 80, y: 64 },
      },
      sheet: "items",
    },
    sound: "pistol", // Will use pistol sound until we have a flamethrower sound
  },
};
