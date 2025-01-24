import { IGameManagers } from "./types";

interface ZombieDistribution {
  total: number;
  regular: number;
  fast: number;
  big: number;
}

export class GameMaster {
  private gameManagers: IGameManagers;

  constructor(gameManagers: IGameManagers) {
    this.gameManagers = gameManagers;
  }

  public getNumberOfZombies(dayNumber: number): ZombieDistribution {
    const playerCount = this.gameManagers.getEntityManager().getPlayerEntities().length;
    const baseZombies = playerCount * BASE_ZOMBIES_PER_PLAYER;
    const additionalZombies = (dayNumber - 1) * ADDITIONAL_ZOMBIES_PER_NIGHT * playerCount;
    const totalZombies = Math.floor(
      Math.min(
        Math.max((baseZombies + additionalZombies) * DIFFICULTY_MULTIPLIER, MIN_TOTAL_ZOMBIES),
        MAX_TOTAL_ZOMBIES
      )
    );

    // Calculate zombie type distribution based on day number
    let bigZombies = 0;
    let fastZombies = 0;
    let regularZombies = totalZombies;

    if (dayNumber >= BIG_ZOMBIE_MIN_NIGHT) {
      bigZombies = Math.floor(totalZombies * ZOMBIE_TYPE_CHANCE.BIG);
      regularZombies -= bigZombies;
    }

    if (dayNumber >= FAST_ZOMBIE_MIN_NIGHT) {
      fastZombies = Math.floor(totalZombies * (ZOMBIE_TYPE_CHANCE.FAST - ZOMBIE_TYPE_CHANCE.BIG));
      regularZombies -= fastZombies;
    }

    return {
      total: totalZombies,
      regular: regularZombies,
      fast: fastZombies,
      big: bigZombies,
    };
  }
}

// Constants
const DIFFICULTY_MULTIPLIER = 2.0;
const BASE_ZOMBIES_PER_PLAYER = 3;
const ADDITIONAL_ZOMBIES_PER_NIGHT = 4;
const MIN_TOTAL_ZOMBIES = 10;
const MAX_TOTAL_ZOMBIES = 200;
const FAST_ZOMBIE_MIN_NIGHT = 3;
const BIG_ZOMBIE_MIN_NIGHT = 5;
const ZOMBIE_TYPE_CHANCE = {
  BIG: 0.1,
  FAST: 0.2,
  REGULAR: 0.7,
} as const;
