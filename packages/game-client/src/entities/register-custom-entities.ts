import { clientEntityOverrideRegistry } from "./entity-override-registry";
import { ENTITY_REGISTRATION_CONFIG } from "@shared/config/entity-registration";
import { EntityType, RawEntity } from "@shared/types/entity";
import { IClientEntity } from "@/entities/util";
import { AssetManager } from "@/managers/asset";
import { PlayerClient } from "@/entities/player";
import { ZombieClient } from "@/entities/zombie";
import { BigZombieClient } from "@/entities/big-zombie";
import { FastZombieClient } from "@/entities/fast-zombie";
import { BatZombieClient } from "@/entities/bat-zombie";
import { SpitterZombieClient } from "./spitter-zombie";
import { ExplodingZombieClient } from "./exploding-zombie";
import { LeapingZombieClient } from "./enemies/leaping-zombie";
import { AcidFlyerClient } from "./acid-flyer";
import { SplitterBossClient } from "./splitter-boss";
import { BulletClient } from "@/entities/bullet";
import { ArrowClient } from "@/entities/arrow";
import { GrenadeProjectileClient } from "./grenade-projectile";
import { FlameProjectileClient } from "./flame-projectile";
import { AcidProjectileClient } from "./acid-projectile";
import { TreeClient } from "@/entities/items/tree";
import { WallClient } from "@/entities/items/wall";
import { WallLevel2Client } from "@/entities/items/wall-level-2";
import { WallLevel3Client } from "@/entities/items/wall-level-3";
import { BandageClient } from "@/entities/items/bandage";
import { EnergyDrinkClient } from "@/entities/items/energy-drink";
import { ClothClient } from "@/entities/items/cloth";
import { WoodClient } from "@/entities/items/wood";
import { CoinClient } from "@/entities/items/coin";
import { GasolineClient } from "@/entities/items/gasoline";
import { SpikesClient } from "@/entities/items/spikes";
import { SpikesLevel2Client } from "@/entities/items/spikes-level-2";
import { SpikesLevel3Client } from "@/entities/items/spikes-level-3";
import { TorchClient } from "@/entities/items/torch";
import { MinersHatClient } from "@/entities/items/miners-hat";
import { LandmineClient } from "@/entities/items/landmine";
import { BearTrapClient } from "@/entities/items/bear-trap";
import { GrenadeClient } from "./items/grenade";
import { MolotovCocktailClient } from "./items/molotov-cocktail";
import { ThrowingKnifeClient } from "./items/throwing-knife";
import { CrateClient } from "./items/crate";
import { GallonDrumClient } from "./items/gallon-drum";
import { SentryGunClient } from "./items/sentry-gun";
import { SentryGunLevel2Client } from "./items/sentry-gun-level-2";
import { SentryGunLevel3Client } from "./items/sentry-gun-level-3";
import { BoundaryClient } from "./items/boundary";
import { PistolAmmoClient } from "@/entities/weapons/pistol-ammo";
import { ShotgunAmmoClient } from "@/entities/weapons/shotgun-ammo";
import { BoltActionAmmoClient } from "@/entities/weapons/bolt-action-ammo";
import { AK47AmmoClient } from "@/entities/weapons/ak47-ammo";
import { GrenadeLauncherAmmoClient } from "@/entities/weapons/grenade-launcher-ammo";
import { FlamethrowerAmmoClient } from "@/entities/weapons/flamethrower-ammo";
import { ArrowAmmoClient } from "@/entities/weapons/arrow-ammo";
import { KnifeClient } from "@/entities/weapons/knife";
import { BaseballBatClient } from "@/entities/weapons/baseball-bat";
import { PistolClient } from "@/entities/weapons/pistol";
import { ShotgunClient } from "@/entities/weapons/shotgun";
import { BoltActionRifleClient } from "@/entities/weapons/bolt-action-rifle";
import { AK47Client } from "@/entities/weapons/ak47";
import { GrenadeLauncherClient } from "@/entities/weapons/grenade-launcher";
import { FlamethrowerClient } from "@/entities/weapons/flamethrower";
import { BowClient } from "@/entities/weapons/bow";
import { ThrowingKnifeProjectileClient } from "@/entities/throwing-knife-projectile";
import { FireClient } from "@/entities/environment/fire";
import { CampsiteFireClient } from "@/entities/environment/campsite-fire";
import { MerchantClient } from "./environment/merchant";
import { CarClient } from "./environment/car";
import { SurvivorClient } from "./environment/survivor";
import { BloodClient } from "./blood";
import { AcidClient } from "./acid";
import { ToxicGasCloudClient } from "./environment/toxic-gas-cloud";
import { ToxicBiomeZoneClient } from "./environment/toxic-biome-zone";

type ClientEntityConstructor = new (
  data: RawEntity,
  assetManager: AssetManager,
  ...args: any[]
) => IClientEntity;

/**
 * Mapping of entity types to their client constructor classes
 * Used with ENTITY_REGISTRATION_CONFIG to register entities
 */
const CLIENT_ENTITY_CONSTRUCTORS: Record<EntityType, ClientEntityConstructor> = {
  player: PlayerClient,
  zombie: ZombieClient,
  big_zombie: BigZombieClient,
  fast_zombie: FastZombieClient,
  bat_zombie: BatZombieClient,
  spitter_zombie: SpitterZombieClient,
  exploding_zombie: ExplodingZombieClient,
  leaping_zombie: LeapingZombieClient,
  grave_tyrant: ZombieClient,
  charging_tyrant: ZombieClient,
  acid_flyer: AcidFlyerClient,
  splitter_boss: SplitterBossClient,
  bullet: BulletClient,
  arrow: ArrowClient,
  throwing_knife_projectile: ThrowingKnifeProjectileClient,
  grenade_projectile: GrenadeProjectileClient,
  flame_projectile: FlameProjectileClient,
  acid_projectile: AcidProjectileClient,
  tree: TreeClient,
  wall: WallClient,
  wall_level_2: WallLevel2Client,
  wall_level_3: WallLevel3Client,
  bandage: BandageClient,
  energy_drink: EnergyDrinkClient,
  cloth: ClothClient,
  wood: WoodClient,
  coin: CoinClient,
  gasoline: GasolineClient,
  spikes: SpikesClient,
  spikes_level_2: SpikesLevel2Client,
  spikes_level_3: SpikesLevel3Client,
  torch: TorchClient,
  miners_hat: MinersHatClient,
  landmine: LandmineClient,
  bear_trap: BearTrapClient,
  grenade: GrenadeClient,
  molotov_cocktail: MolotovCocktailClient,
  throwing_knife: ThrowingKnifeClient,
  crate: CrateClient,
  gallon_drum: GallonDrumClient,
  sentry_gun: SentryGunClient,
  sentry_gun_level_2: SentryGunLevel2Client,
  sentry_gun_level_3: SentryGunLevel3Client,
  boundary: BoundaryClient,
  pistol_ammo: PistolAmmoClient,
  shotgun_ammo: ShotgunAmmoClient,
  bolt_action_ammo: BoltActionAmmoClient,
  ak47_ammo: AK47AmmoClient,
  grenade_launcher_ammo: GrenadeLauncherAmmoClient,
  flamethrower_ammo: FlamethrowerAmmoClient,
  arrow_ammo: ArrowAmmoClient,
  knife: KnifeClient,
  baseball_bat: BaseballBatClient,
  pistol: PistolClient,
  shotgun: ShotgunClient,
  bolt_action_rifle: BoltActionRifleClient,
  ak47: AK47Client,
  grenade_launcher: GrenadeLauncherClient,
  flamethrower: FlamethrowerClient,
  bow: BowClient,
  fire: FireClient,
  campsite_fire: CampsiteFireClient,
  merchant: MerchantClient,
  car: CarClient,
  survivor: SurvivorClient,
  blood: BloodClient,
  acid: AcidClient,
  toxic_gas_cloud: ToxicGasCloudClient,
  toxic_biome_zone: ToxicBiomeZoneClient,
} as Record<EntityType, ClientEntityConstructor>;

/**
 * Registers all custom client entity classes in the override registry
 * This allows the system to use custom classes when they exist,
 * and fall back to generic entities for simple items
 *
 * Uses ENTITY_REGISTRATION_CONFIG to maintain consistent registration order
 * between server and client
 */
export function registerCustomClientEntities(): void {
  for (const entry of ENTITY_REGISTRATION_CONFIG) {
    const constructor = CLIENT_ENTITY_CONSTRUCTORS[entry.type];
    if (constructor) {
      clientEntityOverrideRegistry.register(entry.type, constructor);
    }
  }
}
