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
import { MinersHatClient } from "@/entities/items/miners-hat";
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
import { clientEntityOverrideRegistry } from "./entity-override-registry";
import { itemRegistry } from "@shared/entities";
import { GenericClientEntity } from "./items/generic-client-entity";
import { registerCustomClientEntities } from "./register-custom-entities";

// Register all custom client entity classes at module load time
registerCustomClientEntities();

export class EntityFactory {
  private assetManager: AssetManager;

  constructor(assetManager: AssetManager) {
    this.assetManager = assetManager;
  }

  public createEntity(data: RawEntity): ClientEntityBase {
    if (!data || !data.type) {
      throw new Error(`Invalid entity data: ${JSON.stringify(data)}`);
    }

    // First check override registry for custom client entity classes
    const overrideConstructor = clientEntityOverrideRegistry.get(data.type);
    if (overrideConstructor) {
      return new overrideConstructor(data, this.assetManager) as ClientEntityBase;
    }

    // Fallback to generic entity generation from configs
    const genericEntity = this.createGenericEntity(data);
    if (genericEntity) {
      return genericEntity;
    }

    throw new Error(`Unknown entity type: ${data.type}`);
  }

  private createGenericEntity(data: RawEntity): ClientEntityBase | null {
    // Try to create from item registry
    const itemConfig = itemRegistry.get(data.type);
    if (itemConfig) {
      return new GenericClientEntity(data, this.assetManager, itemConfig);
    }

    // Could add other registry checks here (weapons, environment, etc.)
    // For now, we'll focus on items

    return null;
  }
}
