/**
 * ========================================================================
 * AI CONFIGURATION
 * ========================================================================
 * Configuration constants for AI players in Battle Royale mode.
 * All AI behavior, combat, and decision-making parameters.
 */

export const aiConfig = {
  /**
   * ========================================================================
   * TIMING INTERVALS (in seconds)
   * ========================================================================
   */

  /**
   * How often AI makes decisions (faster = more responsive)
   */
  DECISION_INTERVAL: 0.1,

  /**
   * How often to recalculate pathfinding
   */
  PATH_RECALC_INTERVAL: 0.3,

  /**
   * Cooldown between interact attempts
   */
  INTERACT_COOLDOWN: 0.3,

  /**
   * ========================================================================
   * SEARCH AND DETECTION RANGES (in pixels)
   * ========================================================================
   */

  /**
   * Radius for searching items
   */
  SEARCH_RADIUS: 300,

  /**
   * Enemies this close MUST be engaged (survival)
   */
  IMMEDIATE_THREAT_RADIUS: 80,

  /**
   * Engage enemies within this range if have weapon
   */
  COMBAT_ENGAGE_RADIUS: 140,

  /**
   * How far AI can "see" players
   */
  PLAYER_DETECTION_RADIUS: 200,

  /**
   * How far AI can detect zombies
   */
  ZOMBIE_DETECTION_RADIUS: 200,

  /**
   * ========================================================================
   * COMBAT RANGES FOR WEAPONS (in pixels)
   * ========================================================================
   */

  SHOOTING_RANGE_PISTOL: 100,
  SHOOTING_RANGE_SHOTGUN: 100,
  SHOOTING_RANGE_AK47: 100,
  SHOOTING_RANGE_BOLT_ACTION: 100,

  /**
   * Knife attack range (26px from combat config) + small buffer (2px) for movement
   */
  MELEE_RANGE: 28,

  /**
   * Must match player MAX_INTERACT_RADIUS
   */
  INTERACT_RADIUS: 32,

  /**
   * ========================================================================
   * HEALTH THRESHOLDS (as percentage 0-1)
   * ========================================================================
   */

  /**
   * Below 25%, always retreat
   */
  CRITICAL_HEALTH_THRESHOLD: 0.25,

  /**
   * Below 50%, retreat if not in combat
   */
  RETREAT_HEALTH_THRESHOLD: 0.5,

  /**
   * Above 80%, stop retreating
   */
  RECOVER_HEALTH_THRESHOLD: 0.8,

  /**
   * Enter RETREAT below 50%
   */
  RETREAT_ENTER_HEALTH: 0.5,

  /**
   * Exit RETREAT above 80%
   */
  RETREAT_EXIT_HEALTH: 0.8,

  /**
   * ========================================================================
   * STATE MINIMUM DURATIONS (seconds)
   * ========================================================================
   * Prevents rapid state switching
   */

  /**
   * Commit to retreat for 10s, then "all-in" if can't heal
   */
  STATE_MIN_DURATION_RETREAT: 10.0,

  /**
   * Stay in combat briefly
   */
  STATE_MIN_DURATION_ENGAGE: 0.5,

  /**
   * Finish looting before switching
   */
  STATE_MIN_DURATION_LOOT: 1.0,

  /**
   * Keep hunting for a bit
   */
  STATE_MIN_DURATION_HUNT: 2.0,

  /**
   * Can switch quickly from explore
   */
  STATE_MIN_DURATION_EXPLORE: 0.5,

  /**
   * ========================================================================
   * COMBAT READINESS THRESHOLDS (0-100 score)
   * ========================================================================
   */

  /**
   * Minimum to defend self when attacked
   */
  READINESS_MINIMAL: 30,

  /**
   * Ready to actively hunt (any weapon + ammo)
   */
  READINESS_HUNT: 40,

  /**
   * Fully equipped (good weapon + ammo + bandage)
   */
  READINESS_AGGRESSIVE: 70,

  /**
   * ========================================================================
   * READINESS CALCULATION WEIGHTS (should sum to 100)
   * ========================================================================
   */

  /**
   * 35% from weapon quality
   */
  READINESS_WEIGHT_WEAPON: 35,

  /**
   * 25% from ammo supply
   */
  READINESS_WEIGHT_AMMO: 25,

  /**
   * 25% from bandages
   */
  READINESS_WEIGHT_HEALING: 25,

  /**
   * 15% from current health
   */
  READINESS_WEIGHT_HEALTH: 15,

  /**
   * ========================================================================
   * SUPPLY THRESHOLDS FOR READINESS SCORING
   * ========================================================================
   */

  /**
   * Below this = low ammo
   */
  AMMO_LOW_THRESHOLD: 5,

  /**
   * Above this = well stocked
   */
  AMMO_SUFFICIENT_THRESHOLD: 15,

  /**
   * Need 2+ bandages for full healing score
   */
  BANDAGE_SUFFICIENT_COUNT: 2,

  /**
   * ========================================================================
   * RETREAT BEHAVIOR
   * ========================================================================
   */

  /**
   * Pick up bandages within this radius during retreat
   */
  RETREAT_PICKUP_RADIUS: 200,

  /**
   * ========================================================================
   * COMBAT PARAMETERS
   * ========================================================================
   */

  /**
   * Radians of aim variance (slightly weaker than human)
   */
  SHOOTING_INACCURACY: 0.12,

  /**
   * Stop moving when this close while shooting
   */
  STOP_DISTANCE_FOR_SHOOTING: 60,

  /**
   * Minimum time between shots
   */
  FIRE_RATE_DELAY: 0.15,

  /**
   * Slight delay before responding to new threats (80ms)
   */
  REACTION_DELAY: 0.08,

  /**
   * ========================================================================
   * KITING PARAMETERS (for melee combat)
   * ========================================================================
   */

  /**
   * How long to attack before retreating
   */
  KITE_ATTACK_DURATION: 0.3,

  /**
   * How long to retreat before re-engaging
   */
  KITE_RETREAT_DURATION: 0.4,

  /**
   * Distance to retreat to
   */
  KITE_SAFE_DISTANCE: 80,

  /**
   * After this many attack cycles, disengage to gather supplies
   */
  MAX_KITE_CYCLES: 3,

  /**
   * Minimum cycles before potentially disengaging
   */
  MIN_KITE_CYCLES: 2,

  /**
   * 40% chance to disengage after min cycles
   */
  DISENGAGE_CHANCE: 0.4,

  /**
   * ========================================================================
   * ESCAPE BEHAVIOR
   * ========================================================================
   */

  /**
   * Below 30% HP (3 out of 10), flee completely - no melee
   */
  ESCAPE_HEALTH_THRESHOLD: 0.3,

  /**
   * Flee for 3 seconds before reconsidering
   */
  ESCAPE_DURATION: 3.0,

  /**
   * ========================================================================
   * STUCK DETECTION
   * ========================================================================
   */

  /**
   * How often to check if stuck
   */
  STUCK_CHECK_INTERVAL: 1.5,

  /**
   * If moved less than this in STUCK_CHECK_INTERVAL, we're stuck
   */
  STUCK_DISTANCE_THRESHOLD: 15,

  /**
   * Give up on target after this many stuck detections
   */
  MAX_TARGET_ATTEMPTS: 3,

  /**
   * ========================================================================
   * INVENTORY MANAGEMENT
   * ========================================================================
   */

  /**
   * How often to check for useless items to drop
   */
  INVENTORY_MANAGEMENT_INTERVAL: 2.0,

  /**
   * ========================================================================
   * OPPORTUNISTIC ACTIONS
   * ========================================================================
   */

  /**
   * Pick up good items/ammo/weapons within this radius in any state
   */
  OPPORTUNISTIC_PICKUP_RADIUS: 100,

  /**
   * Destroy crates within this radius in any state
   */
  OPPORTUNISTIC_CRATE_RADIUS: 60,

  /**
   * ========================================================================
   * COMBAT RETARGETING
   * ========================================================================
   */

  /**
   * 50ms during active combat
   */
  COMBAT_RETARGET_INTERVAL: 0.05,

  /**
   * 200ms when not fighting
   */
  IDLE_RETARGET_INTERVAL: 0.2,

  /**
   * ========================================================================
   * DAMAGE MEMORY FOR THREAT TRACKING (in milliseconds)
   * ========================================================================
   */

  /**
   * Remember attackers for 3 seconds
   */
  DAMAGE_MEMORY_DURATION: 3000,

  /**
   * 500ms = "currently attacking me"
   */
  CURRENT_ATTACKER_WINDOW: 500,

  /**
   * ========================================================================
   * SITUATIONAL AWARENESS
   * ========================================================================
   */

  /**
   * 3+ enemies in different directions = surrounded
   */
  SURROUNDED_THRESHOLD: 3,

  /**
   * Retreat if facing this many enemies when hurt
   */
  OUTNUMBERED_RETREAT_THRESHOLD: 3,

  /**
   * ========================================================================
   * FINISH KILL THRESHOLDS
   * ========================================================================
   */

  /**
   * Finish enemies below 15% HP even if we're hurt
   */
  FINISH_KILL_ENEMY_HP: 0.15,

  /**
   * Only try to finish if we're above 30% HP
   */
  FINISH_KILL_MY_HP: 0.3,

  /**
   * ========================================================================
   * PING SIMULATION (milliseconds)
   * ========================================================================
   */

  /**
   * Minimum simulated ping
   */
  MIN_PING: 50,

  /**
   * Maximum simulated ping
   */
  MAX_PING: 70,

  /**
   * ========================================================================
   * AI PLAYER COUNT
   * ========================================================================
   */

  /**
   * Number of AI players to spawn
   */
  DEFAULT_AI_COUNT: 4,

  /**
   * ========================================================================
   * WAYPOINT THRESHOLD
   * ========================================================================
   */

  /**
   * Consider waypoint reached when this close (in pixels)
   */
  WAYPOINT_THRESHOLD: 10,

  /**
   * ========================================================================
   * DEBUG FLAGS
   * ========================================================================
   */

  /**
   * Show AI state above AI player heads on client
   */
  DEBUG_SHOW_AI_STATE: true,

  /**
   * ========================================================================
   * PRIORITY SCORES FOR TARGET SELECTION (loot)
   * ========================================================================
   * Note: Health and ammo priorities have urgency multipliers applied
   */

  /**
   * Enemy right next to us
   */
  PRIORITY_IMMEDIATE_THREAT: 200,

  /**
   * Nearby zombie
   */
  PRIORITY_ZOMBIE_THREAT: 150,

  /**
   * Health item when hurt (base, multiplied by urgency up to 2.4x)
   */
  PRIORITY_HEALTH_URGENT: 150,

  /**
   * Ammo when low (base, multiplied by urgency up to 1.5x)
   */
  PRIORITY_AMMO_NEEDED: 120,

  /**
   * Nearby player to attack
   */
  PRIORITY_PLAYER_TARGET: 120,

  /**
   * Special biomes (farm, city, dock, etc) - high priority early game
   */
  PRIORITY_SPECIAL_BIOME: 95,

  /**
   * Crates to open (increased priority - often have good weapons)
   */
  PRIORITY_CRATE: 90,

  /**
   * Shotgun, AK47, Bolt Action
   */
  PRIORITY_GOOD_WEAPON: 85,

  /**
   * Barrels (gallon drums) to search
   */
  PRIORITY_BARREL: 65,

  /**
   * Any weapon
   */
  PRIORITY_ANY_WEAPON: 50,

  /**
   * Any ammo
   */
  PRIORITY_ANY_AMMO: 40,

  /**
   * Bandage when not urgent
   */
  PRIORITY_BANDAGE: 30,

  /**
   * Random wandering
   */
  PRIORITY_EXPLORE: 10,

  /**
   * ========================================================================
   * STAMINA MANAGEMENT
   * ========================================================================
   */

  /**
   * Don't sprint below 30% stamina unless urgent
   */
  STAMINA_RESERVE_THRESHOLD: 0.3,

  /**
   * Below 10%, never sprint unless escaping
   */
  STAMINA_CRITICAL_THRESHOLD: 0.1,

  /**
   * ========================================================================
   * MOVEMENT PARAMETERS
   * ========================================================================
   */

  /**
   * Balance between smoothness and responsiveness (0-1)
   */
  MOVEMENT_SMOOTHING_FACTOR: 0.4,

  /**
   * Movement speed penalty when pathfinding fails (multiplier)
   */
  STUCK_MOVEMENT_PENALTY: 0.5,

  /**
   * ========================================================================
   * PATHFINDING
   * ========================================================================
   */

  /**
   * Search up to N tiles away for alternative paths
   */
  PATHFINDING_SEARCH_RADIUS_TILES: 3,

  /**
   * ========================================================================
   * ZOMBIE AI WANDER DISTANCE
   * ========================================================================
   */

  /**
   * Minimum wander distance when exploring (in pixels)
   */
  ZOMBIE_WANDER_DISTANCE_MIN: 200,

  /**
   * Maximum wander distance when exploring (in pixels)
   */
  ZOMBIE_WANDER_DISTANCE_MAX: 400,
} as const;

/**
 * Threat scoring weights for prioritizing enemies
 * Higher score = higher priority to attack
 */
export const aiThreatWeights = {
  // Distance-based scoring (closer = more dangerous)
  /**
   * Within IMMEDIATE_THREAT_RADIUS (80px)
   */
  IMMEDIATE_RANGE: 300,

  /**
   * Within 150px
   */
  CLOSE_RANGE: 200,

  /**
   * Within 300px
   */
  MEDIUM_RANGE: 100,

  // Damage-based scoring (KEY FIX for main bug)
  /**
   * Hit me in last 0.5s - HIGHEST PRIORITY
   */
  CURRENTLY_ATTACKING: 250,

  /**
   * Hit me in last 2s
   */
  RECENT_DAMAGE: 150,

  /**
   * Dealt >30% of my recent damage
   */
  HIGH_DAMAGE_SOURCE: 100,

  // Entity type scoring (reduced player bias)
  /**
   * Players are slightly more dangerous
   */
  PLAYER_BONUS: 30,

  // Tactical scoring
  /**
   * Enemy below 30% HP = easy kill
   */
  LOW_HEALTH_ENEMY: 75,

  /**
   * Ranged enemy when I'm melee
   */
  RANGED_THREAT: 60,

  /**
   * Between me and safe zone
   */
  BLOCKING_RETREAT: 80,

  // Negative scoring
  /**
   * Beyond engagement range
   */
  FAR_AWAY_PENALTY: -100,

  /**
   * Attacking someone else
   */
  DISTRACTED_ENEMY: -50,
} as const;

/**
 * Weapon types considered "good"
 */
export const AI_GOOD_WEAPONS = ["shotgun", "ak47", "bolt_action_rifle"] as const;

/**
 * All weapon types
 */
export const AI_ALL_WEAPONS = ["pistol", "shotgun", "ak47", "bolt_action_rifle", "knife"] as const;

/**
 * Ammo types mapped to weapons
 */
export const AI_WEAPON_AMMO_MAP: Record<string, string> = {
  pistol: "pistol_ammo",
  shotgun: "shotgun_ammo",
  ak47: "ak47_ammo",
  bolt_action_rifle: "bolt_action_ammo",
};

/**
 * Weapon priority for selection (higher = better)
 */
export const AI_WEAPON_PRIORITY: Record<string, number> = {
  bolt_action_rifle: 5,
  ak47: 4,
  shotgun: 3,
  pistol: 2,
  knife: 1,
};

/**
 * Melee weapons (no ammo required)
 */
export const AI_MELEE_WEAPONS = ["knife"] as const;

/**
 * Get weapon ranges based on current config
 * Returns a function since config values can be modified at runtime
 */
export function getAiWeaponRanges(config: typeof aiConfig): Record<string, number> {
  return {
    pistol: config.SHOOTING_RANGE_PISTOL,
    shotgun: config.SHOOTING_RANGE_SHOTGUN,
    ak47: config.SHOOTING_RANGE_AK47,
    bolt_action_rifle: config.SHOOTING_RANGE_BOLT_ACTION,
    knife: config.MELEE_RANGE,
  };
}

export type AiConfig = typeof aiConfig;
export type AiThreatWeights = typeof aiThreatWeights;
