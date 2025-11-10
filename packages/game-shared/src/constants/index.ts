import { EntityType } from "@/types/entity";

export const Entities = {
  ZOMBIE: "zombie",
  BIG_ZOMBIE: "big_zombie",
  FAST_ZOMBIE: "fast_zombie",
  EXPLODING_ZOMBIE: "exploding_zombie",
  BAT_ZOMBIE: "bat_zombie",
  SPITTER_ZOMBIE: "spitter_zombie",
  ACID_PROJECTILE: "acid_projectile",
  PLAYER: "player",
  TREE: "tree",
  LEAPING_ZOMBIE: "leaping_zombie",
  BULLET: "bullet",
  WALL: "wall",
  CRATE: "crate",
  BOUNDARY: "boundary",
  BANDAGE: "bandage",
  CLOTH: "cloth",
  SPIKES: "spikes",
  FIRE: "fire",
  TORCH: "torch",
  GASOLINE: "gasoline",
  PISTOL: "pistol",
  SHOTGUN: "shotgun",
  KNIFE: "knife",
  BOLT_ACTION_RIFLE: "bolt_action_rifle",
  AK47: "ak47",
  GRENADE_LAUNCHER: "grenade_launcher",
  FLAMETHROWER: "flamethrower",
  PISTOL_AMMO: "pistol_ammo",
  SHOTGUN_AMMO: "shotgun_ammo",
  BOLT_ACTION_AMMO: "bolt_action_ammo",
  AK47_AMMO: "ak47_ammo",
  GRENADE_LAUNCHER_AMMO: "grenade_launcher_ammo",
  FLAMETHROWER_AMMO: "flamethrower_ammo",
  FLAME_PROJECTILE: "flame_projectile",
  GRENADE_PROJECTILE: "grenade_projectile",
  LANDMINE: "landmine",
  GRENADE: "grenade",
  FIRE_EXTINGUISHER: "fire_extinguisher",
  COIN: "coin",
  MERCHANT: "merchant",
  SENTRY_GUN: "sentry_gun",
  CAR: "car",
} as const;

export const NON_SPAWNABLE = new Set([
  Entities.PLAYER,
  Entities.BULLET,
  Entities.BOUNDARY,
  Entities.ACID_PROJECTILE,
  Entities.GRENADE_PROJECTILE,
  Entities.FLAME_PROJECTILE,
  Entities.MERCHANT,
  Entities.CAR,
]);

export const SPAWNABLE_ENTITY_TYPES: EntityType[] = Object.values(Entities)
  .filter((entity) => !NON_SPAWNABLE.has(entity as any))
  .sort();

// Zombies array will be populated by zombie registry after initialization
// Import zombieRegistry where you need to access all zombie types
export let Zombies: EntityType[] = [];
