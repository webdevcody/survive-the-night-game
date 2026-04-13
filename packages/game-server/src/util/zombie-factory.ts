import { IGameManagers } from "@/managers/types";
import { BaseEnemy } from "@/entities/enemies/base-enemy";
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
import type { ZombieSpawnFixtureKind } from "@shared/map/spawn-palette";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import Positionable from "@/extensions/positionable";

export type ZombieType = ZombieSpawnFixtureKind;

export interface ZombieSpawnOptions {
  /** Position to spawn the zombie at */
  position?: Vector2 | { x: number; y: number };
  /** Whether to add the zombie to the entity manager */
  addToManager?: boolean;
}

/**
 * Factory for creating zombies
 * Consolidates zombie creation logic to reduce duplication
 */
export class ZombieFactory {
  /**
   * Creates a zombie of the specified type
   */
  static createZombie(
    zombieType: ZombieType,
    gameManagers: IGameManagers,
    options: ZombieSpawnOptions = {},
  ): BaseEnemy {
    const { position, addToManager = false } = options;
    let zombie: BaseEnemy;

    switch (zombieType) {
      case "regular":
        zombie = new Zombie(gameManagers);
        break;
      case "fast":
        zombie = new FastZombie(gameManagers);
        break;
      case "big":
        zombie = new BigZombie(gameManagers);
        break;
      case "bat":
        zombie = new BatZombie(gameManagers);
        break;
      case "spitter":
        zombie = new SpitterZombie(gameManagers);
        break;
      case "exploding_zombie":
        zombie = new ExplodingZombie(gameManagers);
        break;
      case "leaping_zombie":
        zombie = new LeapingZombie(gameManagers);
        break;
      case "grave_tyrant":
        zombie = new BossZombie(gameManagers);
        break;
      case "charging_tyrant":
        zombie = new ChargingTyrant(gameManagers);
        break;
      case "acid_flyer":
        zombie = new AcidFlyer(gameManagers);
        break;
      case "splitter_boss":
        zombie = new SplitterBoss(gameManagers);
        break;
      default: {
        const _exhaustive: never = zombieType;
        console.error(`Unknown zombie type: ${_exhaustive}`);
        throw new Error(`Unknown zombie type: ${_exhaustive}`);
      }
    }

    if (position) {
      const pos =
        position instanceof Vector2
          ? position
          : PoolManager.getInstance().vector2.claim(position.x, position.y);
      zombie.getExt(Positionable).setPosition(pos);
    }

    if (addToManager) {
      const entityManager = gameManagers.getEntityManager();
      entityManager.addEntity(zombie);
    }

    return zombie;
  }

  /**
   * Creates and spawns a zombie at a location
   * Convenience method that combines creation, positioning, and registration
   */
  static spawnZombieAtLocation(
    zombieType: ZombieType,
    location: { x: number; y: number },
    gameManagers: IGameManagers,
  ): BaseEnemy {
    return this.createZombie(zombieType, gameManagers, {
      position: location,
      addToManager: true,
    });
  }
}
