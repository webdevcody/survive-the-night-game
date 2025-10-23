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

export interface ZombieConfig {
  id: EntityType;
  category: EntityCategory;
  stats: ZombieStats;
  assets: ZombieAssetConfig;
  movementStrategy: "melee" | "flying" | "ranged";
  attackStrategy: "melee" | "exploding" | "ranged" | "leaping";
  leapConfig?: LeapConfig;
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
