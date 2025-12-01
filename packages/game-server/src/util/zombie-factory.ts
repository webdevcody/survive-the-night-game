import { IGameManagers } from "@/managers/types";
import { IEntityManager } from "@/managers/types";
import { BaseEnemy } from "@/entities/enemies/base-enemy";
import { Zombie } from "@/entities/enemies/zombie";
import { BigZombie } from "@/entities/enemies/big-zombie";
import { FastZombie } from "@/entities/enemies/fast-zombie";
import { BatZombie } from "@/entities/enemies/bat-zombie";
import { SpitterZombie } from "@/entities/enemies/spitter-zombie";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import Positionable from "@/extensions/positionable";

export type ZombieType = "regular" | "fast" | "big" | "bat" | "spitter";

export interface ZombieSpawnOptions {
  /** Position to spawn the zombie at */
  position?: Vector2 | { x: number; y: number };
  /** Whether to add the zombie to the entity manager */
  addToManager?: boolean;
  /** For regular zombies, whether they should be idle */
  isIdle?: boolean;
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
    options: ZombieSpawnOptions = {}
  ): BaseEnemy {
    const { position, addToManager = false, isIdle = false } = options;
    let zombie: BaseEnemy;

    // Create the appropriate zombie type
    switch (zombieType) {
      case "regular":
        zombie = new Zombie(gameManagers, isIdle);
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
      default:
        console.error(`Unknown zombie type: ${zombieType}`);
        throw new Error(`Unknown zombie type: ${zombieType}`);
    }

    // Set position if provided
    if (position) {
      const pos =
        position instanceof Vector2
          ? position
          : PoolManager.getInstance().vector2.claim(position.x, position.y);
      zombie.getExt(Positionable).setPosition(pos);
    }

    // Add to entity manager if requested
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
    isIdle: boolean = false
  ): BaseEnemy {
    return this.createZombie(zombieType, gameManagers, {
      position: location,
      addToManager: true,
      isIdle,
    });
  }
}


