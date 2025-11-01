import { WEAPON_TYPES } from "../types/weapons";
import { WeaponConfig } from "./weapon-registry";

export const WEAPON_CONFIGS: Record<string, WeaponConfig> = {
  [WEAPON_TYPES.KNIFE]: {
    id: WEAPON_TYPES.KNIFE,
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
  },
  [WEAPON_TYPES.PISTOL]: {
    id: WEAPON_TYPES.PISTOL,
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
  },
  [WEAPON_TYPES.SHOTGUN]: {
    id: WEAPON_TYPES.SHOTGUN,
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
  },
  [WEAPON_TYPES.BOLT_ACTION_RIFLE]: {
    id: WEAPON_TYPES.BOLT_ACTION_RIFLE,
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
  },
  [WEAPON_TYPES.AK47]: {
    id: WEAPON_TYPES.AK47,
    stats: {
      cooldown: 0.15,
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
  },
};
