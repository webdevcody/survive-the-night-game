import { entityOverrideRegistry } from "./entity-override-registry";
import { ENTITY_REGISTRATION_CONFIG } from "@shared/config/entity-registration";
import { EntityType } from "@shared/types/entity";
import { Entity } from "@/entities/entity";
import { IGameManagers } from "@/managers/types";
import { Player } from "@/entities/players/player";
import { Zombie } from "@/entities/enemies/zombie";
import { BigZombie } from "@/entities/enemies/big-zombie";
import { FastZombie } from "@/entities/enemies/fast-zombie";
import { BatZombie } from "@/entities/enemies/bat-zombie";
import { SpitterZombie } from "@/entities/enemies/spitter-zombie";
import { ExplodingZombie } from "@/entities/enemies/exploding-zombie";
import { LeapingZombie } from "@/entities/enemies/leaping-zombie";
import { BossZombie } from "@/entities/enemies/boss-zombie";
import { ChargingTyrant } from "@/entities/enemies/charging-tyrant";
import { AcidFlyer } from "@/entities/enemies/acid-flyer";
import { SplitterBoss } from "@/entities/enemies/splitter-boss";
import { Bullet } from "@/entities/projectiles/bullet";
import { Arrow } from "@/entities/projectiles/arrow";
import { GrenadeProjectile } from "@/entities/projectiles/grenade-projectile";
import { FlameProjectile } from "@/entities/projectiles/flame-projectile";
import { ThrowingKnifeProjectile } from "@/entities/projectiles/throwing-knife-projectile";
import { Tree } from "@/entities/items/tree";
import { Wall } from "@/entities/items/wall";
import { WallLevel2 } from "@/entities/items/wall-level-2";
import { WallLevel3 } from "@/entities/items/wall-level-3";
import { Bandage } from "@/entities/items/bandage";
import { EnergyDrink } from "@/entities/items/energy-drink";
import { Cloth } from "@/entities/items/cloth";
import { Wood } from "@/entities/items/wood";
import { Coin } from "@/entities/items/coin";
import { Gasoline } from "@/entities/items/gasoline";
import { Spikes } from "@/entities/items/spikes";
import { SpikesLevel2 } from "@/entities/items/spikes-level-2";
import { SpikesLevel3 } from "@/entities/items/spikes-level-3";
import { Torch } from "@/entities/items/torch";
import { MinersHat } from "@/entities/items/miners-hat";
import { Landmine } from "@/entities/items/landmine";
import { BearTrap } from "@/entities/items/bear-trap";
import { Grenade } from "@/entities/items/grenade";
import { MolotovCocktail } from "@/entities/items/molotov-cocktail";
import { ThrowingKnife } from "@/entities/items/throwing-knife";
import { Crate } from "@/entities/items/crate";
import { GallonDrum } from "@/entities/items/gallon-drum";
import { SentryGun } from "@/entities/items/sentry-gun";
import { SentryGunLevel2 } from "@/entities/items/sentry-gun-level-2";
import { SentryGunLevel3 } from "@/entities/items/sentry-gun-level-3";
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
import { Blood } from "@/entities/effects/blood";
import { Acid } from "@/entities/effects/acid";
import { ToxicGasCloud } from "@/entities/environment/toxic-gas-cloud";
import { ToxicBiomeZone } from "@/entities/environment/toxic-biome-zone";
import { AcidProjectile } from "@/entities/projectiles/acid-projectile";
import { Boundary } from "@/entities/environment/boundary";

type EntityConstructor = new (gameManagers: IGameManagers, ...args: any[]) => Entity;

/**
 * Mapping of entity types to their server constructor classes
 * Used with ENTITY_REGISTRATION_CONFIG to register entities
 */
const SERVER_ENTITY_CONSTRUCTORS: Record<EntityType, EntityConstructor> = {
  player: Player,
  zombie: Zombie,
  big_zombie: BigZombie,
  fast_zombie: FastZombie,
  bat_zombie: BatZombie,
  spitter_zombie: SpitterZombie,
  exploding_zombie: ExplodingZombie,
  leaping_zombie: LeapingZombie,
  grave_tyrant: BossZombie,
  charging_tyrant: ChargingTyrant,
  acid_flyer: AcidFlyer,
  splitter_boss: SplitterBoss,
  bullet: Bullet,
  arrow: Arrow,
  throwing_knife_projectile: ThrowingKnifeProjectile,
  grenade_projectile: GrenadeProjectile,
  flame_projectile: FlameProjectile,
  acid_projectile: AcidProjectile,
  tree: Tree,
  wall: Wall,
  wall_level_2: WallLevel2,
  wall_level_3: WallLevel3,
  bandage: Bandage,
  energy_drink: EnergyDrink,
  cloth: Cloth,
  wood: Wood,
  coin: Coin,
  gasoline: Gasoline,
  spikes: Spikes,
  spikes_level_2: SpikesLevel2,
  spikes_level_3: SpikesLevel3,
  torch: Torch,
  miners_hat: MinersHat,
  landmine: Landmine,
  bear_trap: BearTrap,
  grenade: Grenade,
  molotov_cocktail: MolotovCocktail,
  throwing_knife: ThrowingKnife,
  crate: Crate,
  gallon_drum: GallonDrum,
  sentry_gun: SentryGun,
  sentry_gun_level_2: SentryGunLevel2,
  sentry_gun_level_3: SentryGunLevel3,
  pistol_ammo: PistolAmmo,
  shotgun_ammo: ShotgunAmmo,
  bolt_action_ammo: BoltActionAmmo,
  ak47_ammo: AK47Ammo,
  grenade_launcher_ammo: GrenadeLauncherAmmo,
  flamethrower_ammo: FlamethrowerAmmo,
  arrow_ammo: ArrowAmmo,
  knife: Knife,
  baseball_bat: BaseballBat,
  pistol: Pistol,
  shotgun: Shotgun,
  bolt_action_rifle: BoltActionRifle,
  ak47: AK47,
  grenade_launcher: GrenadeLauncher,
  flamethrower: Flamethrower,
  bow: Bow,
  fire: Fire,
  campsite_fire: CampsiteFire,
  merchant: Merchant,
  car: Car,
  survivor: Survivor,
  blood: Blood,
  acid: Acid,
  toxic_gas_cloud: ToxicGasCloud,
  toxic_biome_zone: ToxicBiomeZone,
  boundary: Boundary,
} as Record<EntityType, EntityConstructor>;

/**
 * Registers all custom entity classes in the override registry
 * This allows the system to use custom classes when they exist,
 * and fall back to generic entities for simple items
 *
 * Uses ENTITY_REGISTRATION_CONFIG to maintain consistent registration order
 * between server and client
 */
export function registerCustomEntities(): void {
  for (const entry of ENTITY_REGISTRATION_CONFIG) {
    const constructor = SERVER_ENTITY_CONSTRUCTORS[entry.type];
    if (constructor) {
      entityOverrideRegistry.register(entry.type, constructor);
    }
  }
}
