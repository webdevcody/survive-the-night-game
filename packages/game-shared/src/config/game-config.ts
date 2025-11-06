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

export const VERSION = "v0.3.0";

// ========================================================================
// DAY/NIGHT CYCLE
// ========================================================================

/**
 * Day duration in seconds
 */
export const DAY_DURATION = 60;

/**
 * Night duration in seconds
 */
export const NIGHT_DURATION = 90;

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
// SIMULATION & TICK RATE
// ========================================================================

/**
 * Server tick rate (simulation rate)
 * Both client and server must use this for physics calculations
 */
export const SIMULATION_TICK_RATE = 20; // ticks per second

/**
 * Fixed timestep in seconds
 * Calculated from tick rate
 */
export const FIXED_TIMESTEP = 1 / SIMULATION_TICK_RATE; // 0.05 seconds

export const PLAYER_MOVEMENT_PER_TICK = PLAYER_SPEED * FIXED_TIMESTEP; // Movement per physics tick (3 pixels)

// ========================================================================
// KEYBINDINGS (Display Names)
// ========================================================================

/**
 * Display names for keys shown in UI
 * These are what the user sees in tooltips and interaction prompts
 */
export const KEYBINDINGS = {
  INTERACT: "f",
  FIRE: "space",
  DROP: "g",
  QUICK_HEAL: "z",
  CRAFT: "c",
  CYCLE_WEAPON_PREV: "q",
  CYCLE_WEAPON_NEXT: "e",
  SPRINT: "shift",
  CHAT: "y",
  TOGGLE_MUTE: "m",
  TOGGLE_INSTRUCTIONS: "i",
  PLAYER_LIST: "tab",
} as const;

// ========================================================================
// MERCHANT SHOP
// ========================================================================

/**
 * Items available in the merchant shop with their prices in coins
 */
export interface MerchantShopItem {
  itemType: string;
  price: number;
}

export const MERCHANT_SHOP_ITEMS: MerchantShopItem[] = [
  // Consumables & Healing
  { itemType: "bandage", price: 10 },
  { itemType: "cloth", price: 5 },

  // Ammunition
  { itemType: "pistol_ammo", price: 15 },
  { itemType: "shotgun_ammo", price: 20 },

  // Explosives & Throwables
  { itemType: "landmine", price: 50 },
  { itemType: "grenade", price: 30 },
  { itemType: "fire_extinguisher", price: 25 },

  // Light & Fuel
  { itemType: "torch", price: 8 },
  { itemType: "gasoline", price: 12 },
];
