import { WeaponType } from "../types/weapons";

export interface WeaponStats {
  cooldown: number;
  damage?: number;
  pushDistance?: number;
  spreadAngle?: number;
}

export interface WeaponAssetConfig {
  assetPrefix: string;
  spritePositions: {
    right: { x: number; y: number };
    down: { x: number; y: number };
    up: { x: number; y: number };
    // left will be right flipped
  };
  sheet?: string;
}

export interface WeaponConfig {
  id: WeaponType;
  stats: WeaponStats;
  assets: WeaponAssetConfig;
}

class WeaponRegistry {
  private weapons = new Map<WeaponType, WeaponConfig>();

  register(config: WeaponConfig): void {
    this.weapons.set(config.id, config);
  }

  get(id: WeaponType): WeaponConfig | undefined {
    return this.weapons.get(id);
  }

  getAll(): WeaponConfig[] {
    return Array.from(this.weapons.values());
  }

  getAllWeaponTypes(): WeaponType[] {
    return Array.from(this.weapons.keys());
  }

  has(id: WeaponType): boolean {
    return this.weapons.has(id);
  }
}

export const weaponRegistry = new WeaponRegistry();
