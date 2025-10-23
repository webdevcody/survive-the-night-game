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
};
