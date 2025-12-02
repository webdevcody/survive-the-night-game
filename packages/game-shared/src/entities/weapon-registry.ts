import { BehaviorConfigs } from "./behavior-configs";

export interface WeaponStats {
  cooldown: number;
  damage?: number;
  pushDistance?: number;
  spreadAngle?: number;
  /**
   * The recoil knockback strength of the weapon.
   * @default 0
   */
  recoilKnockback?: number;
  /**
   * Camera shake intensity to apply on the client when this weapon is used.
   */
  cameraShakeIntensity?: number;
}

export interface WeaponAssetConfig {
  assetPrefix: string;
  spritePositions: {
    right: { x: number; y: number };
    down: { x: number; y: number };
    up: { x: number; y: number };
    // left will be right flipped
  };
  sheet: string; // Required - must specify which sprite sheet to use
}

export interface WeaponConfig extends BehaviorConfigs {
  id: string;
  type?: "melee" | "ranged"; // Weapon type: melee for close-range weapons, ranged for projectile weapons
  stats: WeaponStats;
  assets: WeaponAssetConfig;
  sound?: string; // Sound file name (without .mp3 extension) to play when weapon is fired
  ammoType?: string;
  autoPickup?: boolean; // If false, weapon will never be auto-picked up (defaults to undefined/null for default behavior)
}

class WeaponRegistry {
  private weapons = new Map<string, WeaponConfig>();

  register(config: WeaponConfig): void {
    if (!config.assets.sheet) {
      throw new Error(
        `Weapon "${config.id}" is missing required 'sheet' property in assets. ` +
          `All weapons must specify which sprite sheet to use.`
      );
    }
    this.weapons.set(config.id, config);
  }

  get(id: string): WeaponConfig | undefined {
    return this.weapons.get(id);
  }

  getAll(): WeaponConfig[] {
    return Array.from(this.weapons.values());
  }

  getAllWeaponTypes(): string[] {
    return Array.from(this.weapons.keys());
  }

  has(id: string): boolean {
    return this.weapons.has(id);
  }
}

export const weaponRegistry = new WeaponRegistry();
