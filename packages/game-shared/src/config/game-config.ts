/**
 * ========================================================================
 * GAME CONFIGURATION - SINGLE SOURCE OF TRUTH
 * ========================================================================
 *
 * This file contains ALL tuneable game settings in one place.
 * Edit values here and rebuild to apply changes everywhere.
 *
 * Used by both client and server to ensure consistency.
 * ========================================================================
 */

// ========================================================================
// GAME META
// ========================================================================

export const VERSION = "v0.2.0";

// ========================================================================
// WORLD & TILE CONSTANTS
// ========================================================================

export const TILE_SIZE = 16;
export const WALL_MAX_HEALTH = 10;

// ========================================================================
// PLAYER CONSTANTS
// ========================================================================

export const MAX_PLAYER_HEALTH = 10;
export const MAX_INVENTORY_SLOTS = 8;
export const MAX_INTERACT_RADIUS = 20;

/**
 * Player movement speed in pixels per second
 * Used by both client prediction and server authoritative movement
 */
export const PLAYER_SPEED = 60;

/**
 * Speed multiplier when sprinting
 * Applied to PLAYER_SPEED when sprint is active and stamina available
 */
export const SPRINT_MULTIPLIER = 1.5;

/**
 * Maximum stamina points
 */
export const MAX_STAMINA = 100;

/**
 * Stamina drain rate per second while sprinting
 */
export const STAMINA_DRAIN_RATE = 25;

/**
 * Stamina regeneration rate per second when not sprinting
 */
export const STAMINA_REGEN_RATE = 10;

/**
 * Seconds before stamina can regenerate after full depletion
 */
export const EXHAUSTION_DURATION = 3.0;

// ========================================================================
// COMBAT CONSTANTS
// ========================================================================

export const KNIFE_ATTACK_RANGE = 26;
export const ZOMBIE_ATTACK_RADIUS = 18;
export const BULLET_SIZE = 4;
export const LANDMINE_EXPLOSION_RADIUS = 32;

// ========================================================================
// NETWORK SIMULATION (for testing lag/prediction)
// ========================================================================

/**
 * Simulated network latency in milliseconds
 *
 * Adds artificial delay to network messages for testing.
 * Both client and server should use the same value.
 *
 * VALUES:
 * - 0: No delay (production/normal gameplay)
 * - 50: Moderate latency (current setting for testing)
 * - 100: High latency
 * - 200+: Very poor connection
 */
export const SIMULATED_LATENCY_MS = 0;

// ========================================================================
// CLIENT-SIDE PREDICTION & INTERPOLATION
// ========================================================================

/**
 * Enable client-side prediction
 *
 * true: Client predicts movement (responsive but may rubber band)
 * false: Client waits for server (laggy but accurate)
 *
 * Recommended: true (always enabled in production)
 */
export const CLIENT_PREDICTION_ENABLED = true;

/**
 * Interpolation delay in milliseconds
 * Higher = smoother but more delayed movement for remote players
 */
export const INTERPOLATION_DELAY_MS = 100;

/**
 * Maximum position snapshots kept per entity for interpolation
 */
export const INTERPOLATION_MAX_SNAPSHOTS = 3;

/**
 * Server reconciliation snap threshold in pixels
 *
 * When client position differs from server by more than this,
 * snap immediately to server position.
 *
 * VALUES:
 * - 25: Very strict (more rubber banding)
 * - 50: Balanced
 * - 75-100: Loose (less rubber banding but more drift)
 * - 275: Current setting (very loose, for testing)
 */
export const SNAP_THRESHOLD = 75;

/**
 * Small error correction smoothing factor
 * When error is small (5-50px), lerp towards server position
 * 0.5 = 50% correction per update
 */
export const CORRECTION_SMOOTHING_FACTOR = 0.25;

/**
 * Minimum error threshold in pixels
 * Below this, trust client prediction completely
 */
export const MIN_ERROR_THRESHOLD = 20;

// ========================================================================
// DEBUG VISUALIZATION
// ========================================================================

/**
 * Show debug visualizations
 *
 * true: Shows server ghost position, hitboxes, debug info
 * false: Normal game rendering
 *
 * Recommended:
 * - false (production)
 * - true (current: for debugging rubber banding)
 */
export const SHOW_DEBUG_VISUALS = false;
