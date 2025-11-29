/**
 * Configuration constants for AI players in Battle Royale mode
 */
export const AI_CONFIG = {
  // Timing intervals (in seconds)
  DECISION_INTERVAL: 0.1, // How often AI makes decisions (faster = more responsive)
  PATH_RECALC_INTERVAL: 0.3, // How often to recalculate pathfinding
  INTERACT_COOLDOWN: 0.3, // Cooldown between interact attempts

  // Search and detection ranges (in pixels)
  SEARCH_RADIUS: 300, // Radius for searching items

  // Threat detection ranges
  IMMEDIATE_THREAT_RADIUS: 80, // Enemies this close MUST be engaged (survival)
  COMBAT_ENGAGE_RADIUS: 140, // Engage enemies within this range if have weapon
  PLAYER_DETECTION_RADIUS: 200, // How far AI can "see" players
  ZOMBIE_DETECTION_RADIUS: 200, // How far AI can detect zombies

  // Combat ranges for weapons
  SHOOTING_RANGE_PISTOL: 100,
  SHOOTING_RANGE_SHOTGUN: 100,
  SHOOTING_RANGE_AK47: 100,
  SHOOTING_RANGE_BOLT_ACTION: 100,
  // Use actual knife attack range from combat config (26px)
  // Add small buffer (2px) to account for movement during attack
  MELEE_RANGE: 28, // Knife attack range (26px) + small buffer (2px) for movement

  INTERACT_RADIUS: 20, // Must match player MAX_INTERACT_RADIUS

  // Health thresholds (as percentage 0-1)
  CRITICAL_HEALTH_THRESHOLD: 0.25, // Below 25%, always retreat
  RETREAT_HEALTH_THRESHOLD: 0.5, // Below 50%, retreat if not in combat
  RECOVER_HEALTH_THRESHOLD: 0.8, // Above 80%, stop retreating

  // Hysteresis thresholds (separate enter/exit to prevent oscillation)
  RETREAT_ENTER_HEALTH: 0.5, // Enter RETREAT below 50%
  RETREAT_EXIT_HEALTH: 0.8, // Exit RETREAT above 80%

  // Minimum state durations (seconds) - prevents rapid state switching
  STATE_MIN_DURATION_RETREAT: 10.0, // Commit to retreat for 10s, then "all-in" if can't heal
  STATE_MIN_DURATION_ENGAGE: 0.5, // Stay in combat briefly
  STATE_MIN_DURATION_LOOT: 1.0, // Finish looting before switching
  STATE_MIN_DURATION_HUNT: 2.0, // Keep hunting for a bit
  STATE_MIN_DURATION_EXPLORE: 0.5, // Can switch quickly from explore

  // Combat readiness thresholds (0-100 score)
  READINESS_MINIMAL: 30, // Minimum to defend self when attacked
  READINESS_HUNT: 40, // Ready to actively hunt (any weapon + ammo)
  READINESS_AGGRESSIVE: 70, // Fully equipped (good weapon + ammo + bandage)

  // Readiness calculation weights (should sum to 100)
  READINESS_WEIGHT_WEAPON: 35, // 35% from weapon quality
  READINESS_WEIGHT_AMMO: 25, // 25% from ammo supply
  READINESS_WEIGHT_HEALING: 25, // 25% from bandages
  READINESS_WEIGHT_HEALTH: 15, // 15% from current health

  // Supply thresholds for readiness scoring
  AMMO_LOW_THRESHOLD: 5, // Below this = low ammo
  AMMO_SUFFICIENT_THRESHOLD: 15, // Above this = well stocked
  BANDAGE_SUFFICIENT_COUNT: 2, // Need 2+ bandages for full healing score

  // Retreat behavior
  RETREAT_PICKUP_RADIUS: 200, // Pick up bandages within this radius during retreat

  // Combat parameters
  SHOOTING_INACCURACY: 0.12, // Radians of aim variance (slightly weaker than human)
  STOP_DISTANCE_FOR_SHOOTING: 60, // Stop moving when this close while shooting
  FIRE_RATE_DELAY: 0.15, // Minimum time between shots
  REACTION_DELAY: 0.08, // Slight delay before responding to new threats (80ms)

  // Kiting parameters (for melee combat)
  KITE_ATTACK_DURATION: 0.3, // How long to attack before retreating
  KITE_RETREAT_DURATION: 0.4, // How long to retreat before re-engaging
  KITE_SAFE_DISTANCE: 80, // Distance to retreat to
  MAX_KITE_CYCLES: 3, // After this many attack cycles, disengage to gather supplies
  MIN_KITE_CYCLES: 2, // Minimum cycles before potentially disengaging
  DISENGAGE_CHANCE: 0.4, // 40% chance to disengage after min cycles

  // Escape behavior
  ESCAPE_HEALTH_THRESHOLD: 0.3, // Below 30% HP (3 out of 10), flee completely - no melee
  ESCAPE_DURATION: 3.0, // Flee for 3 seconds before reconsidering

  // Stuck detection
  STUCK_CHECK_INTERVAL: 1.5, // How often to check if stuck
  STUCK_DISTANCE_THRESHOLD: 15, // If moved less than this in STUCK_CHECK_INTERVAL, we're stuck
  MAX_TARGET_ATTEMPTS: 3, // Give up on target after this many stuck detections

  // Inventory management
  INVENTORY_MANAGEMENT_INTERVAL: 2.0, // How often to check for useless items to drop

  // Opportunistic pickup radius
  OPPORTUNISTIC_PICKUP_RADIUS: 100, // Pick up good items/ammo/weapons within this radius in any state
  OPPORTUNISTIC_CRATE_RADIUS: 60, // Destroy crates within this radius in any state

  // Combat retargeting (faster during combat)
  COMBAT_RETARGET_INTERVAL: 0.05, // 50ms during active combat
  IDLE_RETARGET_INTERVAL: 0.2, // 200ms when not fighting

  // Damage memory for threat tracking
  DAMAGE_MEMORY_DURATION: 3000, // Remember attackers for 3 seconds
  CURRENT_ATTACKER_WINDOW: 500, // 500ms = "currently attacking me"

  // Situational awareness
  SURROUNDED_THRESHOLD: 3, // 3+ enemies in different directions = surrounded
  OUTNUMBERED_RETREAT_THRESHOLD: 3, // Retreat if facing this many enemies when hurt

  // Finish kill threshold
  FINISH_KILL_ENEMY_HP: 0.15, // Finish enemies below 15% HP even if we're hurt
  FINISH_KILL_MY_HP: 0.3, // Only try to finish if we're above 30% HP

  // Ping simulation (milliseconds)
  MIN_PING: 50,
  MAX_PING: 70,

  // AI player count
  DEFAULT_AI_COUNT: 4,

  // Waypoint threshold (pixels) - consider waypoint reached when this close
  WAYPOINT_THRESHOLD: 10,

  // Debug flags
  DEBUG_SHOW_AI_STATE: true, // Show AI state above AI player heads on client

  // Priority scores for target selection (loot)
  // Note: Health and ammo priorities have urgency multipliers applied in findBestLootTarget
  PRIORITY_IMMEDIATE_THREAT: 200, // Enemy right next to us
  PRIORITY_ZOMBIE_THREAT: 150, // Nearby zombie
  PRIORITY_HEALTH_URGENT: 150, // Health item when hurt (base, multiplied by urgency up to 2.4x)
  PRIORITY_AMMO_NEEDED: 120, // Ammo when low (base, multiplied by urgency up to 1.5x)
  PRIORITY_PLAYER_TARGET: 120, // Nearby player to attack
  PRIORITY_SPECIAL_BIOME: 95, // Special biomes (farm, city, dock, etc) - high priority early game
  PRIORITY_CRATE: 90, // Crates to open (increased priority - often have good weapons)
  PRIORITY_GOOD_WEAPON: 85, // Shotgun, AK47, Bolt Action
  PRIORITY_BARREL: 65, // Barrels (gallon drums) to search
  PRIORITY_ANY_WEAPON: 50, // Any weapon
  PRIORITY_ANY_AMMO: 40, // Any ammo
  PRIORITY_BANDAGE: 30, // Bandage when not urgent
  PRIORITY_EXPLORE: 10, // Random wandering
};

/**
 * Threat scoring weights for prioritizing enemies
 * Higher score = higher priority to attack
 */
export const THREAT_WEIGHTS = {
  // Distance-based scoring (closer = more dangerous)
  IMMEDIATE_RANGE: 300, // Within IMMEDIATE_THREAT_RADIUS (80px)
  CLOSE_RANGE: 200, // Within 150px
  MEDIUM_RANGE: 100, // Within 300px

  // Damage-based scoring (KEY FIX for main bug)
  CURRENTLY_ATTACKING: 250, // Hit me in last 0.5s - HIGHEST PRIORITY
  RECENT_DAMAGE: 150, // Hit me in last 2s
  HIGH_DAMAGE_SOURCE: 100, // Dealt >30% of my recent damage

  // Entity type scoring (reduced player bias)
  PLAYER_BONUS: 30, // Players are slightly more dangerous (was ~50)

  // Tactical scoring
  LOW_HEALTH_ENEMY: 75, // Enemy below 30% HP = easy kill
  RANGED_THREAT: 60, // Ranged enemy when I'm melee
  BLOCKING_RETREAT: 80, // Between me and safe zone

  // Negative scoring
  FAR_AWAY_PENALTY: -100, // Beyond engagement range
  DISTRACTED_ENEMY: -50, // Attacking someone else
};

// Weapon types considered "good"
export const GOOD_WEAPONS = ["shotgun", "ak47", "bolt_action_rifle"] as const;

// All weapon types
export const ALL_WEAPONS = ["pistol", "shotgun", "ak47", "bolt_action_rifle", "knife"] as const;

// Ammo types mapped to weapons
export const WEAPON_AMMO_MAP: Record<string, string> = {
  pistol: "pistol_ammo",
  shotgun: "shotgun_ammo",
  ak47: "ak47_ammo",
  bolt_action_rifle: "bolt_action_ammo",
};

// Weapon effective ranges
export const WEAPON_RANGES: Record<string, number> = {
  pistol: AI_CONFIG.SHOOTING_RANGE_PISTOL,
  shotgun: AI_CONFIG.SHOOTING_RANGE_SHOTGUN,
  ak47: AI_CONFIG.SHOOTING_RANGE_AK47,
  bolt_action_rifle: AI_CONFIG.SHOOTING_RANGE_BOLT_ACTION,
  knife: AI_CONFIG.MELEE_RANGE,
};

// Weapon priority for selection (higher = better)
export const WEAPON_PRIORITY: Record<string, number> = {
  bolt_action_rifle: 5,
  ak47: 4,
  shotgun: 3,
  pistol: 2,
  knife: 1,
};

// Melee weapons (no ammo required)
export const MELEE_WEAPONS = ["knife"] as const;
