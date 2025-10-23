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
  },
};
