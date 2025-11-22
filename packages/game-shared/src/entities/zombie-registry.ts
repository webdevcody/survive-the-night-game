import { EntityType } from "../types/entity";
import Vector2 from "../util/vector2";

export const EntityCategories = {
  ZOMBIE: "zombie",
  PLAYER: "player",
  ITEM: "item",
  WEAPON: "weapon",
  PROJECTILE: "projectile",
  ENVIRONMENT: "environment",
  STRUCTURE: "structure",
} as const;

export type EntityCategory = (typeof EntityCategories)[keyof typeof EntityCategories];

export interface ZombieStats {
  speed: number;
  health: number;
  damage: number;
  attackCooldown: number;
  attackRadius: number;
  dropChance: number;
  size: Vector2;
}

export interface ZombieAssetConfig {
  assetPrefix: string;
  animationDuration: number;
  debugWaypointColor: string;
  minimapColor?: string;
  frameLayout: {
    startX: number;
    downY: number;
    leftY: number;
    upY: number;
    totalFrames: number;
    sheet?: string;
  };
  deadFrame?: {
    x: number;
    y: number;
    sheet?: string;
  };
}

export interface LeapConfig {
  leapRange: number; // Maximum distance to trigger leap (player must be > attackRadius and <= leapRange)
  leapSpeed: number; // Speed during leap (overrides normal movement)
  leapCooldown: number; // Cooldown between leaps
  leapDuration: number; // How long the leap velocity boost lasts
}

export interface ChargeConfig {
  chargeDistanceThreshold: number; // Start charging when player is within this distance
  slamDistanceThreshold: number; // Slam when within this distance of player
  recoveryTime: number; // Recovery time in seconds after slam
  chargeSpeedMultiplier: number; // Speed multiplier during charge (e.g., 3 = 3x normal speed)
  slamRadius: number; // Radius of ground slam attack
  slamDamage: number; // Damage dealt by ground slam
  knockbackForce: number; // Knockback force applied to players
}

export interface CrossDiveConfig {
  approachDistance: number; // Distance from car to start diving
  diveCooldownDuration: number; // Cooldown between dives
  acidDropInterval: number; // Interval between acid drops during dive
}

export interface BossHealthBarConfig {
  width: number;
  height?: number;
  offsetY?: number;
  backgroundColor?: string;
  fillColor?: string;
  borderColor?: string;
}

export interface BossCameraShakeConfig {
  intensity: number;
  durationMs: number;
  intervalMs: number;
}

export interface BossMetadata {
  name: string;
  nameColor?: string;
  nameFont?: string;
  nameOffsetY?: number;
  healthBar?: BossHealthBarConfig;
  cameraShake?: BossCameraShakeConfig;
}

export interface ZombieConfig {
  id: EntityType;
  category: EntityCategory;
  stats: ZombieStats;
  assets: ZombieAssetConfig;
  movementStrategy: "melee" | "flying" | "ranged" | "cross-dive";
  attackStrategy: "melee" | "exploding" | "ranged" | "leaping";
  leapConfig?: LeapConfig;
  chargeConfig?: ChargeConfig;
  crossDiveConfig?: CrossDiveConfig;
  boss?: BossMetadata;
}

class ZombieRegistry {
  private zombies = new Map<EntityType, ZombieConfig>();

  register(config: ZombieConfig): void {
    this.zombies.set(config.id, config);
  }

  get(id: EntityType): ZombieConfig | undefined {
    return this.zombies.get(id);
  }

  getAll(): ZombieConfig[] {
    return Array.from(this.zombies.values());
  }

  getAllZombieTypes(): EntityType[] {
    return Array.from(this.zombies.keys());
  }

  has(id: EntityType): boolean {
    return this.zombies.has(id);
  }
}

export const zombieRegistry = new ZombieRegistry();
