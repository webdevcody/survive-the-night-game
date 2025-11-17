import { entityOverrideRegistry } from "./entity-override-registry";
import { Player } from "@/entities/player";
import { Zombie } from "@/entities/enemies/zombie";
import { BigZombie } from "@/entities/enemies/big-zombie";
import { FastZombie } from "@/entities/enemies/fast-zombie";
import { BatZombie } from "@/entities/enemies/bat-zombie";
import { SpitterZombie } from "@/entities/enemies/spitter-zombie";
import { ExplodingZombie } from "@/entities/enemies/exploding-zombie";
import { LeapingZombie } from "@/entities/enemies/leaping-zombie";
import { BossZombie } from "@/entities/enemies/boss-zombie";
import { Bullet } from "@/entities/projectiles/bullet";
import { Arrow } from "@/entities/projectiles/arrow";
import { GrenadeProjectile } from "@/entities/projectiles/grenade-projectile";
import { FlameProjectile } from "@/entities/projectiles/flame-projectile";
import { Tree } from "@/entities/items/tree";
import { Wall } from "@/entities/items/wall";
import { Bandage } from "@/entities/items/bandage";
import { Cloth } from "@/entities/items/cloth";
import { Wood } from "@/entities/items/wood";
import { Coin } from "@/entities/items/coin";
import { Gasoline } from "@/entities/items/gasoline";
import { Spikes } from "@/entities/items/spikes";
import { Torch } from "@/entities/items/torch";
import { MinersHat } from "@/entities/items/miners-hat";
import { Landmine } from "@/entities/items/landmine";
import { BearTrap } from "@/entities/items/bear-trap";
import { Grenade } from "@/entities/items/grenade";
import { Crate } from "@/entities/items/crate";
import { GallonDrum } from "@/entities/items/gallon-drum";
import { SentryGun } from "@/entities/items/sentry-gun";
import { PistolAmmo } from "@/entities/items/pistol-ammo";
import { ShotgunAmmo } from "@/entities/items/shotgun-ammo";
import { BoltActionAmmo } from "@/entities/items/bolt-action-ammo";
import { AK47Ammo } from "@/entities/items/ak47-ammo";
import { GrenadeLauncherAmmo } from "@/entities/items/grenade-launcher-ammo";
import { FlamethrowerAmmo } from "@/entities/items/flamethrower-ammo";
import { ArrowAmmo } from "@/entities/items/arrow-ammo";
import { Knife } from "@/entities/weapons/knife";
import { BaseballBat } from "@/entities/weapons/baseball-bat";
import { Pistol } from "@/entities/weapons/pistol";
import { Shotgun } from "@/entities/weapons/shotgun";
import { BoltActionRifle } from "@/entities/weapons/bolt-action-rifle";
import { AK47 } from "@/entities/weapons/ak47";
import { GrenadeLauncher } from "@/entities/weapons/grenade-launcher";
import { Flamethrower } from "@/entities/weapons/flamethrower";
import { Bow } from "@/entities/weapons/bow";
import { Fire } from "@/entities/environment/fire";
import { CampsiteFire } from "@/entities/environment/campsite-fire";
import { Merchant } from "@/entities/environment/merchant";
import { Car } from "@/entities/environment/car";
import { Survivor } from "@/entities/environment/survivor";
import { Blood } from "@/entities/blood";

/**
 * Registers all custom entity classes in the override registry
 * This allows the system to use custom classes when they exist,
 * and fall back to generic entities for simple items
 *
 * Uses string literals instead of Entities constants to avoid dependency on Entities
 * being initialized before this runs
 */
export function registerCustomEntities(): void {
  // Player (special - no config)
  entityOverrideRegistry.register("player", Player);

  // Zombies
  entityOverrideRegistry.register("zombie", Zombie);
  entityOverrideRegistry.register("big_zombie", BigZombie);
  entityOverrideRegistry.register("fast_zombie", FastZombie);
  entityOverrideRegistry.register("bat_zombie", BatZombie);
  entityOverrideRegistry.register("spitter_zombie", SpitterZombie);
  entityOverrideRegistry.register("exploding_zombie", ExplodingZombie);
  entityOverrideRegistry.register("leaping_zombie", LeapingZombie);
  entityOverrideRegistry.register("boss_zombie", BossZombie);

  // Projectiles
  entityOverrideRegistry.register("bullet", Bullet);
  entityOverrideRegistry.register("arrow", Arrow);
  entityOverrideRegistry.register("grenade_projectile", GrenadeProjectile);
  entityOverrideRegistry.register("flame_projectile", FlameProjectile);

  // Items with custom behavior
  entityOverrideRegistry.register("tree", Tree);
  entityOverrideRegistry.register("wall", Wall);
  entityOverrideRegistry.register("bandage", Bandage);
  entityOverrideRegistry.register("cloth", Cloth);
  entityOverrideRegistry.register("wood", Wood);
  entityOverrideRegistry.register("coin", Coin);
  entityOverrideRegistry.register("gasoline", Gasoline);
  entityOverrideRegistry.register("spikes", Spikes);
  entityOverrideRegistry.register("torch", Torch);
  entityOverrideRegistry.register("miners_hat", MinersHat);
  entityOverrideRegistry.register("landmine", Landmine);
  entityOverrideRegistry.register("bear_trap", BearTrap);
  entityOverrideRegistry.register("grenade", Grenade);
  entityOverrideRegistry.register("crate", Crate);
  entityOverrideRegistry.register("gallon_drum", GallonDrum);
  entityOverrideRegistry.register("sentry_gun", SentryGun);

  // Ammo (uses StackableItem base class)
  entityOverrideRegistry.register("pistol_ammo", PistolAmmo);
  entityOverrideRegistry.register("shotgun_ammo", ShotgunAmmo);
  entityOverrideRegistry.register("bolt_action_ammo", BoltActionAmmo);
  entityOverrideRegistry.register("ak47_ammo", AK47Ammo);
  entityOverrideRegistry.register("grenade_launcher_ammo", GrenadeLauncherAmmo);
  entityOverrideRegistry.register("flamethrower_ammo", FlamethrowerAmmo);
  entityOverrideRegistry.register("arrow_ammo", ArrowAmmo);

  // Weapons
  entityOverrideRegistry.register("knife", Knife);
  entityOverrideRegistry.register("baseball_bat", BaseballBat);
  entityOverrideRegistry.register("pistol", Pistol);
  entityOverrideRegistry.register("shotgun", Shotgun);
  entityOverrideRegistry.register("bolt_action_rifle", BoltActionRifle);
  entityOverrideRegistry.register("ak47", AK47);
  entityOverrideRegistry.register("grenade_launcher", GrenadeLauncher);
  entityOverrideRegistry.register("flamethrower", Flamethrower);
  entityOverrideRegistry.register("bow", Bow);

  // Environment
  entityOverrideRegistry.register("fire", Fire);
  entityOverrideRegistry.register("campsite_fire", CampsiteFire);
  entityOverrideRegistry.register("merchant", Merchant);
  entityOverrideRegistry.register("car", Car);
  entityOverrideRegistry.register("survivor", Survivor);
  entityOverrideRegistry.register("blood", Blood);

  // Note: Boundary is server-only and created manually, no need to register
}
