import { RawEntity } from "@shared/types/entity";
import { Entities } from "@shared/constants";
import { AssetManager } from "@/managers/asset";
import { BulletClient } from "@/entities/bullet";
import { ZombieClient } from "@/entities/zombie";
import { BigZombieClient } from "@/entities/big-zombie";
import { FastZombieClient } from "@/entities/fast-zombie";
import { BatZombieClient } from "@/entities/bat-zombie";
import { WallClient } from "@/entities/items/wall";
import { ClothClient } from "@/entities/items/cloth";
import { CoinClient } from "@/entities/items/coin";
import { PlayerClient } from "@/entities/player";
import { TreeClient } from "@/entities/items/tree";
import { BandageClient } from "@/entities/items/bandage";
import { SpikesClient } from "@/entities/items/spikes";
import { FireClient } from "@/entities/environment/fire";
import { TorchClient } from "@/entities/items/torch";
import { GasolineClient } from "@/entities/items/gasoline";
import { PistolClient } from "@/entities/weapons/pistol";
import { ShotgunClient } from "@/entities/weapons/shotgun";
import { KnifeClient } from "@/entities/weapons/knife";
import { BoltActionRifleClient } from "@/entities/weapons/bolt-action-rifle";
import { AK47Client } from "@/entities/weapons/ak47";
import { GrenadeLauncherClient } from "@/entities/weapons/grenade-launcher";
import { FlamethrowerClient } from "@/entities/weapons/flamethrower";
import { PistolAmmoClient } from "@/entities/weapons/pistol-ammo";
import { ShotgunAmmoClient } from "@/entities/weapons/shotgun-ammo";
import { BoltActionAmmoClient } from "@/entities/weapons/bolt-action-ammo";
import { AK47AmmoClient } from "@/entities/weapons/ak47-ammo";
import { GrenadeLauncherAmmoClient } from "@/entities/weapons/grenade-launcher-ammo";
import { FlamethrowerAmmoClient } from "@/entities/weapons/flamethrower-ammo";
import { LandmineClient } from "@/entities/items/landmine";
import { ClientEntityBase } from "@/extensions/client-entity";
import { GrenadeClient } from "./items/grenade";
import { FireExtinguisherClient } from "@/entities/items/fire-extinguisher";
import { SpitterZombieClient } from "./spitter-zombie";
import { AcidProjectileClient } from "./acid-projectile";
import { ExplodingZombieClient } from "./exploding-zombie";
import { LeapingZombieClient } from "./enemies/leaping-zombie";
import { MerchantClient } from "./environment/merchant";
import { GrenadeProjectileClient } from "./grenade-projectile";
import { FlameProjectileClient } from "./flame-projectile";
import { SentryGunClient } from "./items/sentry-gun";
import { CrateClient } from "./items/crate";
import { CarClient } from "./environment/car";

export const entityMap = {
  [Entities.PLAYER]: PlayerClient,
  [Entities.TREE]: TreeClient,
  [Entities.BULLET]: BulletClient,
  [Entities.GRENADE_PROJECTILE]: GrenadeProjectileClient,
  [Entities.FLAME_PROJECTILE]: FlameProjectileClient,
  [Entities.WALL]: WallClient,
  [Entities.PISTOL]: PistolClient,
  [Entities.PISTOL_AMMO]: PistolAmmoClient,
  [Entities.SHOTGUN]: ShotgunClient,
  [Entities.SHOTGUN_AMMO]: ShotgunAmmoClient,
  [Entities.BOLT_ACTION_RIFLE]: BoltActionRifleClient,
  [Entities.BOLT_ACTION_AMMO]: BoltActionAmmoClient,
  [Entities.AK47]: AK47Client,
  [Entities.CRATE]: CrateClient,
  [Entities.AK47_AMMO]: AK47AmmoClient,
  [Entities.GRENADE_LAUNCHER]: GrenadeLauncherClient,
  [Entities.GRENADE_LAUNCHER_AMMO]: GrenadeLauncherAmmoClient,
  [Entities.FLAMETHROWER]: FlamethrowerClient,
  [Entities.FLAMETHROWER_AMMO]: FlamethrowerAmmoClient,
  [Entities.KNIFE]: KnifeClient,
  [Entities.BANDAGE]: BandageClient,
  [Entities.CLOTH]: ClothClient,
  [Entities.COIN]: CoinClient,
  [Entities.SPIKES]: SpikesClient,
  [Entities.FIRE]: FireClient,
  [Entities.TORCH]: TorchClient,
  [Entities.GASOLINE]: GasolineClient,
  [Entities.ZOMBIE]: ZombieClient,
  [Entities.BIG_ZOMBIE]: BigZombieClient,
  [Entities.FAST_ZOMBIE]: FastZombieClient,
  [Entities.EXPLODING_ZOMBIE]: ExplodingZombieClient,
  [Entities.BAT_ZOMBIE]: BatZombieClient,
  [Entities.LANDMINE]: LandmineClient,
  [Entities.GRENADE]: GrenadeClient,
  [Entities.FIRE_EXTINGUISHER]: FireExtinguisherClient,
  [Entities.SPITTER_ZOMBIE]: SpitterZombieClient,
  [Entities.ACID_PROJECTILE]: AcidProjectileClient,
  [Entities.LEAPING_ZOMBIE]: LeapingZombieClient,
  [Entities.MERCHANT]: MerchantClient,
  [Entities.SENTRY_GUN]: SentryGunClient,
  [Entities.CAR]: CarClient,
} as const;

export class EntityFactory {
  private assetManager: AssetManager;

  constructor(assetManager: AssetManager) {
    this.assetManager = assetManager;
  }

  public createEntity(data: RawEntity): ClientEntityBase {
    if (!data || !data.type) {
      throw new Error(`Invalid entity data: ${JSON.stringify(data)}`);
    }

    const EntityClass = (entityMap as any)[data.type];
    if (!EntityClass) {
      throw new Error(`Unknown entity type: ${data.type}`);
    }

    return new EntityClass(data, this.assetManager);
  }
}
