import { ProjectileConfig } from "./projectile-registry";

export const PROJECTILE_CONFIGS: Record<string, ProjectileConfig> = {
  bullet: {
    id: "bullet",
    category: "bullet",
    assets: {
      assetKey: "bullet",
      x: 68,
      y: 171,
      sheet: "default",
    },
  },
  acid_projectile: {
    id: "acid_projectile",
    category: "acid",
    assets: {
      assetKey: "acid_projectile",
      x: 96,
      y: 171,
      sheet: "default",
    },
  },
  grenade_projectile: {
    id: "grenade_projectile",
    category: "explosive",
    assets: {
      assetKey: "grenade",
      x: 64,
      y: 0,
      sheet: "items",
    },
  },
  flame_projectile: {
    id: "flame_projectile",
    category: "explosive",
    assets: {
      assetKey: "flame",
      x: 85,
      y: 266,
      sheet: "default",
    },
  },
  throwing_knife_projectile: {
    id: "throwing_knife_projectile",
    category: "bullet",
    assets: {
      assetKey: "throwing_knife",
      x: 17,
      y: 171,
      sheet: "default",
    },
  },
};
