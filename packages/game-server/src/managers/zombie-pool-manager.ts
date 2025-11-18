import { ObjectPool } from "@shared/util/pool-manager";
import { Zombie } from "@/entities/enemies/zombie";
import { FastZombie } from "@/entities/enemies/fast-zombie";
import { BigZombie } from "@/entities/enemies/big-zombie";
import { BatZombie } from "@/entities/enemies/bat-zombie";
import { SpitterZombie } from "@/entities/enemies/spitter-zombie";
import { ExplodingZombie } from "@/entities/enemies/exploding-zombie";
import { LeapingZombie } from "@/entities/enemies/leaping-zombie";
import { BossZombie } from "@/entities/enemies/boss-zombie";
import { IGameManagers } from "./types";
import { BaseEnemy } from "@/entities/enemies/base-enemy";

export class ZombiePoolManager {
  private static instance: ZombiePoolManager;
  private gameManagers: IGameManagers;

  private pools: Map<string, ObjectPool<BaseEnemy>> = new Map();

  private constructor(gameManagers: IGameManagers) {
    this.gameManagers = gameManagers;
    this.initializePools();
  }

  public static getInstance(): ZombiePoolManager {
    if (!ZombiePoolManager.instance) {
      throw new Error("ZombiePoolManager not initialized. Call initialize() first.");
    }
    return ZombiePoolManager.instance;
  }

  public static initialize(gameManagers: IGameManagers): void {
    if (!ZombiePoolManager.instance) {
      ZombiePoolManager.instance = new ZombiePoolManager(gameManagers);
    }
  }

  private initializePools() {
    this.createPool("zombie", () => new Zombie(this.gameManagers));
    this.createPool("fast_zombie", () => new FastZombie(this.gameManagers));
    this.createPool("big_zombie", () => new BigZombie(this.gameManagers));
    this.createPool("bat_zombie", () => new BatZombie(this.gameManagers));
    this.createPool("spitter_zombie", () => new SpitterZombie(this.gameManagers));
    this.createPool("exploding_zombie", () => new ExplodingZombie(this.gameManagers));
    this.createPool("leaping_zombie", () => new LeapingZombie(this.gameManagers));
    this.createPool("boss_zombie", () => new BossZombie(this.gameManagers));
  }

  private createPool<T extends BaseEnemy>(type: string, createFn: () => T) {
    const pool = new ObjectPool<T>(
      createFn,
      (zombie) => {
        zombie.reset();
        return zombie;
      },
      20 // Initial pool size
    );
    this.pools.set(type, pool as ObjectPool<BaseEnemy>);
  }

  public acquire(type: string): BaseEnemy {
    const pool = this.pools.get(type);
    if (!pool) {
      throw new Error(`No pool found for zombie type: ${type}`);
    }
    return pool.claim();
  }

  public release(zombie: BaseEnemy): void {
    const type = zombie.getType();
    const pool = this.pools.get(type);
    if (pool) {
      pool.release(zombie);
    } else {
      console.warn(`ZombiePoolManager: Trying to release unknown zombie type ${type}`);
    }
  }
}

