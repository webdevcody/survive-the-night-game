import { clientEntityOverrideRegistry } from "./entity-override-registry";
import { PlayerClient } from "@/entities/player";
import { ZombieClient } from "@/entities/zombie";
import { BigZombieClient } from "@/entities/big-zombie";
import { FastZombieClient } from "@/entities/fast-zombie";
import { BatZombieClient } from "@/entities/bat-zombie";
import { SpitterZombieClient } from "./spitter-zombie";
import { ExplodingZombieClient } from "./exploding-zombie";
import { LeapingZombieClient } from "./enemies/leaping-zombie";
import { BulletClient } from "@/entities/bullet";
import { GrenadeProjectileClient } from "./grenade-projectile";
import { FlameProjectileClient } from "./flame-projectile";
import { TreeClient } from "@/entities/items/tree";
import { WallClient } from "@/entities/items/wall";
import { BandageClient } from "@/entities/items/bandage";
import { ClothClient } from "@/entities/items/cloth";
import { CoinClient } from "@/entities/items/coin";
import { GasolineClient } from "@/entities/items/gasoline";
import { SpikesClient } from "@/entities/items/spikes";
import { TorchClient } from "@/entities/items/torch";
import { MinersHatClient } from "@/entities/items/miners-hat";
import { LandmineClient } from "@/entities/items/landmine";
import { BearTrapClient } from "@/entities/items/bear-trap";
import { GrenadeClient } from "./items/grenade";
import { CrateClient } from "./items/crate";
import { SentryGunClient } from "./items/sentry-gun";
import { PistolAmmoClient } from "@/entities/weapons/pistol-ammo";
import { ShotgunAmmoClient } from "@/entities/weapons/shotgun-ammo";
import { BoltActionAmmoClient } from "@/entities/weapons/bolt-action-ammo";
import { AK47AmmoClient } from "@/entities/weapons/ak47-ammo";
import { GrenadeLauncherAmmoClient } from "@/entities/weapons/grenade-launcher-ammo";
import { FlamethrowerAmmoClient } from "@/entities/weapons/flamethrower-ammo";
import { KnifeClient } from "@/entities/weapons/knife";
import { BaseballBatClient } from "@/entities/weapons/baseball-bat";
import { PistolClient } from "@/entities/weapons/pistol";
import { ShotgunClient } from "@/entities/weapons/shotgun";
import { BoltActionRifleClient } from "@/entities/weapons/bolt-action-rifle";
import { AK47Client } from "@/entities/weapons/ak47";
import { GrenadeLauncherClient } from "@/entities/weapons/grenade-launcher";
import { FlamethrowerClient } from "@/entities/weapons/flamethrower";
import { FireClient } from "@/entities/environment/fire";
import { CampsiteFireClient } from "@/entities/environment/campsite-fire";
import { MerchantClient } from "./environment/merchant";
import { CarClient } from "./environment/car";
import { SurvivorClient } from "./environment/survivor";
import { AcidProjectileClient } from "./acid-projectile";
import { BoundaryClient } from "./items/boundary";

/**
 * Registers all custom client entity classes in the override registry
 * This allows the system to use custom classes when they exist,
 * and fall back to generic entities for simple items
 *
 * Uses string literals instead of Entities constants to avoid dependency on Entities
 * being initialized before this runs
 */
export function registerCustomClientEntities(): void {
  // Player (special - no config)
  clientEntityOverrideRegistry.register("player", PlayerClient);

  // Zombies
  clientEntityOverrideRegistry.register("zombie", ZombieClient);
  clientEntityOverrideRegistry.register("big_zombie", BigZombieClient);
  clientEntityOverrideRegistry.register("fast_zombie", FastZombieClient);
  clientEntityOverrideRegistry.register("bat_zombie", BatZombieClient);
  clientEntityOverrideRegistry.register("spitter_zombie", SpitterZombieClient);
  clientEntityOverrideRegistry.register("exploding_zombie", ExplodingZombieClient);
  clientEntityOverrideRegistry.register("leaping_zombie", LeapingZombieClient);

  // Projectiles
  clientEntityOverrideRegistry.register("bullet", BulletClient);
  clientEntityOverrideRegistry.register("grenade_projectile", GrenadeProjectileClient);
  clientEntityOverrideRegistry.register("flame_projectile", FlameProjectileClient);
  clientEntityOverrideRegistry.register("acid_projectile", AcidProjectileClient);

  // Items with custom behavior
  clientEntityOverrideRegistry.register("tree", TreeClient);
  clientEntityOverrideRegistry.register("wall", WallClient);
  clientEntityOverrideRegistry.register("bandage", BandageClient);
  clientEntityOverrideRegistry.register("cloth", ClothClient);
  clientEntityOverrideRegistry.register("coin", CoinClient);
  clientEntityOverrideRegistry.register("gasoline", GasolineClient);
  clientEntityOverrideRegistry.register("spikes", SpikesClient);
  clientEntityOverrideRegistry.register("torch", TorchClient);
  clientEntityOverrideRegistry.register("miners_hat", MinersHatClient);
  clientEntityOverrideRegistry.register("landmine", LandmineClient);
  clientEntityOverrideRegistry.register("bear_trap", BearTrapClient);
  clientEntityOverrideRegistry.register("grenade", GrenadeClient);
  clientEntityOverrideRegistry.register("crate", CrateClient);
  clientEntityOverrideRegistry.register("sentry_gun", SentryGunClient);

  // Ammo
  clientEntityOverrideRegistry.register("pistol_ammo", PistolAmmoClient);
  clientEntityOverrideRegistry.register("shotgun_ammo", ShotgunAmmoClient);
  clientEntityOverrideRegistry.register("bolt_action_ammo", BoltActionAmmoClient);
  clientEntityOverrideRegistry.register("ak47_ammo", AK47AmmoClient);
  clientEntityOverrideRegistry.register("grenade_launcher_ammo", GrenadeLauncherAmmoClient);
  clientEntityOverrideRegistry.register("flamethrower_ammo", FlamethrowerAmmoClient);

  // Weapons
  clientEntityOverrideRegistry.register("knife", KnifeClient);
  clientEntityOverrideRegistry.register("baseball_bat", BaseballBatClient);
  clientEntityOverrideRegistry.register("pistol", PistolClient);
  clientEntityOverrideRegistry.register("shotgun", ShotgunClient);
  clientEntityOverrideRegistry.register("bolt_action_rifle", BoltActionRifleClient);
  clientEntityOverrideRegistry.register("ak47", AK47Client);
  clientEntityOverrideRegistry.register("grenade_launcher", GrenadeLauncherClient);
  clientEntityOverrideRegistry.register("flamethrower", FlamethrowerClient);

  // Environment
  clientEntityOverrideRegistry.register("fire", FireClient);
  clientEntityOverrideRegistry.register("campsite_fire", CampsiteFireClient);
  clientEntityOverrideRegistry.register("merchant", MerchantClient);
  clientEntityOverrideRegistry.register("car", CarClient);
  clientEntityOverrideRegistry.register("survivor", SurvivorClient);
  clientEntityOverrideRegistry.register("boundary", BoundaryClient);
}
