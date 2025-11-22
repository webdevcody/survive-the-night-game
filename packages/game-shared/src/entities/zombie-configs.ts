import { combatConfig } from "../config/combat-config";
import Vector2 from "../util/vector2";
import PoolManager from "../util/pool-manager";
import { ZombieConfig, EntityCategories } from "./zombie-registry";

export const ZOMBIE_CONFIGS: Record<string, ZombieConfig> = {
  zombie: {
    id: "zombie",
    category: EntityCategories.ZOMBIE,
    stats: {
      speed: 35,
      health: 3,
      damage: 1,
      attackCooldown: 1,
      attackRadius: combatConfig.ZOMBIE_ATTACK_RADIUS,
      dropChance: 0.7,
      size: PoolManager.getInstance().vector2.claim(16, 16),
    },
    assets: {
      assetPrefix: "zombie",
      animationDuration: 500,
      debugWaypointColor: "yellow",
      minimapColor: "red",
      frameLayout: {
        startX: 0,
        downY: 16,
        leftY: 32,
        upY: 0,
        totalFrames: 3,
        sheet: "characters", // Regular zombie uses characters sheet
      },
      deadFrame: {
        x: 144,
        y: 0,
        sheet: "characters", // Dead frame also on characters sheet
      },
    },
    movementStrategy: "melee",
    attackStrategy: "melee",
  },
  big_zombie: {
    id: "big_zombie",
    category: EntityCategories.ZOMBIE,
    stats: {
      speed: 20,
      health: 11,
      damage: 3,
      attackCooldown: 1.5,
      attackRadius: combatConfig.ZOMBIE_ATTACK_RADIUS,
      dropChance: 1,
      size: PoolManager.getInstance().vector2.claim(16, 16),
    },
    assets: {
      assetPrefix: "big_zombie",
      animationDuration: 500,
      debugWaypointColor: "orange",
      minimapColor: "red",
      frameLayout: {
        startX: 0,
        downY: 64,
        leftY: 80,
        upY: 48,
        totalFrames: 3,
        sheet: "characters",
      },
      deadFrame: {
        x: 144,
        y: 0,
        sheet: "characters",
      },
    },
    movementStrategy: "melee",
    attackStrategy: "melee",
  },
  fast_zombie: {
    id: "fast_zombie",
    category: EntityCategories.ZOMBIE,
    stats: {
      speed: 45,
      health: 1,
      damage: 1,
      attackCooldown: 0.5,
      attackRadius: combatConfig.ZOMBIE_ATTACK_RADIUS,
      dropChance: 0.3,
      size: PoolManager.getInstance().vector2.claim(16, 16),
    },
    assets: {
      assetPrefix: "fast_zombie",
      animationDuration: 250,
      debugWaypointColor: "red",
      minimapColor: "red",
      frameLayout: {
        startX: 0,
        downY: 208,
        leftY: 224,
        upY: 192,
        totalFrames: 3,
        sheet: "characters",
      },
      deadFrame: {
        x: 144,
        y: 0,
        sheet: "characters",
      },
    },
    movementStrategy: "melee",
    attackStrategy: "melee",
  },
  exploding_zombie: {
    id: "exploding_zombie",
    category: EntityCategories.ZOMBIE,
    stats: {
      speed: 45,
      health: 1,
      damage: 0, // Damage comes from explosion, not attack
      attackCooldown: 0.5,
      attackRadius: combatConfig.ZOMBIE_ATTACK_RADIUS,
      dropChance: 0.3,
      size: PoolManager.getInstance().vector2.claim(8, 8),
    },
    assets: {
      assetPrefix: "exploding_zombie",
      animationDuration: 250,
      debugWaypointColor: "red",
      minimapColor: "red",
      frameLayout: {
        startX: 0,
        downY: 64,
        leftY: 80,
        upY: 48,
        totalFrames: 3,
        sheet: "characters",
      },
      deadFrame: {
        x: 144,
        y: 0,
        sheet: "characters",
      },
    },
    movementStrategy: "melee",
    attackStrategy: "exploding",
  },
  bat_zombie: {
    id: "bat_zombie",
    category: EntityCategories.ZOMBIE,
    stats: {
      speed: 30,
      health: 1,
      damage: 1,
      attackCooldown: 0.5,
      attackRadius: combatConfig.ZOMBIE_ATTACK_RADIUS,
      dropChance: 0.2,
      size: PoolManager.getInstance().vector2.claim(8, 8),
    },
    assets: {
      assetPrefix: "bat_zombie",
      animationDuration: 200,
      debugWaypointColor: "purple",
      minimapColor: "blue",
      frameLayout: {
        startX: 0,
        downY: 240,
        leftY: 240,
        upY: 240,
        totalFrames: 3,
        sheet: "characters",
      },
      deadFrame: {
        x: 48,
        y: 240,
        sheet: "characters",
      },
    },
    movementStrategy: "flying",
    attackStrategy: "melee",
  },
  spitter_zombie: {
    id: "spitter_zombie",
    category: EntityCategories.ZOMBIE,
    stats: {
      speed: 25,
      health: 2,
      damage: 2,
      attackCooldown: 2,
      attackRadius: 100, // Larger attack radius for ranged
      dropChance: 0.5,
      size: PoolManager.getInstance().vector2.claim(16, 16),
    },
    assets: {
      assetPrefix: "spitter_zombie",
      animationDuration: 750,
      debugWaypointColor: "green",
      minimapColor: "purple",
      frameLayout: {
        startX: 0,
        downY: 160,
        leftY: 176,
        upY: 144,
        totalFrames: 4,
        sheet: "characters",
      },
      deadFrame: {
        x: 144,
        y: 0,
        sheet: "characters",
      },
    },
    movementStrategy: "ranged",
    attackStrategy: "ranged",
  },
  leaping_zombie: {
    id: "leaping_zombie",
    category: EntityCategories.ZOMBIE,
    stats: {
      speed: 40,
      health: 7,
      damage: 2,
      attackCooldown: 1, // Cooldown for swipe attack
      attackRadius: 28,
      dropChance: 0.5,
      size: PoolManager.getInstance().vector2.claim(16, 16),
    },
    assets: {
      assetPrefix: "leaping_zombie",
      animationDuration: 750,
      debugWaypointColor: "green",
      minimapColor: "purple",
      frameLayout: {
        startX: 0,
        downY: 160,
        leftY: 176,
        upY: 144,
        totalFrames: 4,
        sheet: "characters",
      },
      deadFrame: {
        x: 144,
        y: 0,
        sheet: "characters",
      },
    },
    movementStrategy: "melee",
    attackStrategy: "leaping",
    leapConfig: {
      leapRange: 80, // Maximum distance to trigger leap (must be > attackRadius)
      leapSpeed: 800, // Speed multiplier during leap (overrides normal movement speed)
      leapCooldown: 3, // Cooldown between leaps
      leapDuration: 0.7, // How long the leap velocity boost lasts
    },
  },
  grave_tyrant: {
    id: "grave_tyrant",
    category: EntityCategories.ZOMBIE,
    stats: {
      speed: 25,
      health: 35,
      damage: 4,
      attackCooldown: 1.25,
      attackRadius: combatConfig.ZOMBIE_ATTACK_RADIUS,
      dropChance: 1,
      size: PoolManager.getInstance().vector2.claim(16, 16),
    },
    assets: {
      assetPrefix: "grave_tyrant",
      animationDuration: 700,
      debugWaypointColor: "crimson",
      minimapColor: "orange",
      frameLayout: {
        startX: 64,
        downY: 16,
        leftY: 32,
        upY: 0,
        totalFrames: 3,
        sheet: "characters",
      },
      deadFrame: {
        x: 144,
        y: 0,
        sheet: "characters",
      },
    },
    movementStrategy: "melee",
    attackStrategy: "melee",
    boss: {
      name: "Grave Tyrant",
      nameColor: "#ff3b30",
      nameFont: "6px Arial",
      healthBar: {
        width: 24,
        height: 3,
        offsetY: 6,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        fillColor: "#ff5555",
        borderColor: "#3d0000",
      },
      cameraShake: {
        intensity: 0.35,
        durationMs: 220,
        intervalMs: 2000,
      },
    },
  },
  charging_tyrant: {
    id: "charging_tyrant",
    category: EntityCategories.ZOMBIE,
    stats: {
      speed: 15,
      health: 50,
      damage: 2,
      attackCooldown: 2,
      attackRadius: 64,
      dropChance: 1,
      size: PoolManager.getInstance().vector2.claim(16, 16),
    },
    assets: {
      assetPrefix: "charging_tyrant",
      animationDuration: 500,
      debugWaypointColor: "darkred",
      minimapColor: "darkorange",
      frameLayout: {
        startX: 0,
        downY: 64,
        leftY: 80,
        upY: 48,
        totalFrames: 3,
        sheet: "characters",
      },
      deadFrame: {
        x: 144,
        y: 0,
        sheet: "characters",
      },
    },
    movementStrategy: "melee",
    attackStrategy: "melee",
    chargeConfig: {
      chargeDistanceThreshold: 200, // Start charging when player is within this distance
      slamDistanceThreshold: 24, // Slam when within this distance of player
      recoveryTime: 2, // Recovery time in seconds after slam
      chargeSpeedMultiplier: 6, // Speed multiplier during charge (3x normal speed)
      slamRadius: 32, // Radius of ground slam attack
      slamDamage: 2, // Damage dealt by ground slam
      knockbackForce: 600, // Knockback force applied to players
    },
    boss: {
      name: "Big Bertha",
      nameColor: "#8b0000",
      nameFont: "6px Arial",
      healthBar: {
        width: 24,
        height: 3,
        offsetY: 6,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        fillColor: "#ff3333",
        borderColor: "#3d0000",
      },
      cameraShake: {
        intensity: 2.0,
        durationMs: 300,
        intervalMs: 1500,
      },
    },
  },
};
