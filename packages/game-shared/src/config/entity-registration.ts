import { EntityType } from "../types/entity";

/**
 * Entity registration configuration
 * Defines the entity types and their categories for registration
 * Used by both server and client to maintain consistent registration order
 */

export type EntityCategory =
  | "player"
  | "zombies"
  | "projectiles"
  | "items"
  | "ammo"
  | "weapons"
  | "environment";

export interface EntityRegistrationEntry {
  type: EntityType;
  category: EntityCategory;
}

/**
 * Entity registration entries in the order they should be registered
 * This ensures consistent registration order between server and client
 */
export const ENTITY_REGISTRATION_CONFIG: EntityRegistrationEntry[] = [
  // Player (special - no config)
  { type: "player", category: "player" },

  // Zombies
  { type: "zombie", category: "zombies" },
  { type: "big_zombie", category: "zombies" },
  { type: "fast_zombie", category: "zombies" },
  { type: "bat_zombie", category: "zombies" },
  { type: "spitter_zombie", category: "zombies" },
  { type: "exploding_zombie", category: "zombies" },
  { type: "leaping_zombie", category: "zombies" },
  { type: "grave_tyrant", category: "zombies" },
  { type: "charging_tyrant", category: "zombies" },
  { type: "acid_flyer", category: "zombies" },
  { type: "splitter_boss", category: "zombies" },

  // Projectiles
  { type: "bullet", category: "projectiles" },
  { type: "arrow", category: "projectiles" },
  { type: "throwing_knife_projectile", category: "projectiles" },
  { type: "grenade_projectile", category: "projectiles" },
  { type: "flame_projectile", category: "projectiles" },
  { type: "acid_projectile", category: "projectiles" },

  // Items with custom behavior
  { type: "tree", category: "items" },
  { type: "wall", category: "items" },
  { type: "wall_level_2", category: "items" },
  { type: "wall_level_3", category: "items" },
  { type: "bandage", category: "items" },
  { type: "energy_drink", category: "items" },
  { type: "cloth", category: "items" },
  { type: "wood", category: "items" },
  { type: "coin", category: "items" },
  { type: "gasoline", category: "items" },
  { type: "spikes", category: "items" },
  { type: "spikes_level_2", category: "items" },
  { type: "spikes_level_3", category: "items" },
  { type: "torch", category: "items" },
  { type: "miners_hat", category: "items" },
  { type: "landmine", category: "items" },
  { type: "bear_trap", category: "items" },
  { type: "grenade", category: "items" },
  { type: "molotov_cocktail", category: "items" },
  { type: "throwing_knife", category: "items" },
  { type: "crate", category: "items" },
  { type: "gallon_drum", category: "items" },
  { type: "sentry_gun", category: "items" },
  { type: "sentry_gun_level_2", category: "items" },
  { type: "sentry_gun_level_3", category: "items" },
  { type: "boundary", category: "items" },

  // Ammo (uses StackableItem base class)
  { type: "pistol_ammo", category: "ammo" },
  { type: "shotgun_ammo", category: "ammo" },
  { type: "bolt_action_ammo", category: "ammo" },
  { type: "ak47_ammo", category: "ammo" },
  { type: "grenade_launcher_ammo", category: "ammo" },
  { type: "flamethrower_ammo", category: "ammo" },
  { type: "arrow_ammo", category: "ammo" },

  // Weapons
  { type: "knife", category: "weapons" },
  { type: "baseball_bat", category: "weapons" },
  { type: "pistol", category: "weapons" },
  { type: "shotgun", category: "weapons" },
  { type: "bolt_action_rifle", category: "weapons" },
  { type: "ak47", category: "weapons" },
  { type: "grenade_launcher", category: "weapons" },
  { type: "flamethrower", category: "weapons" },
  { type: "bow", category: "weapons" },

  // Environment
  { type: "fire", category: "environment" },
  { type: "campsite_fire", category: "environment" },
  { type: "merchant", category: "environment" },
  { type: "car", category: "environment" },
  { type: "survivor", category: "environment" },
  { type: "blood", category: "environment" },
  { type: "acid", category: "environment" },
  { type: "toxic_gas_cloud", category: "environment" },
  { type: "toxic_biome_zone", category: "environment" },
];


