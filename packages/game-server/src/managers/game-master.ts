import { IGameManagers } from "./types";

interface ZombieDistribution {
  total: number;
  regular: number;
  fast: number;
  big: number;
  bat: number;
  spitter: number;
}

interface ZombieType {
  type: string;
  weight: number;
  minWave: number;
}

// Constants
const MAX_TOTAL_ZOMBIES = 200;
const BASE_ZOMBIES = 6;
const BASE_ZOMBIES_PER_WAVE = 3;
const ZOMBIES_PER_PLAYER_PER_WAVE = 3;

const ZOMBIE_TYPES: ZombieType[] = [
  { type: "regular", weight: 10, minWave: 1 },
  { type: "fast", weight: 3, minWave: 2 },
  { type: "big", weight: 1, minWave: 4 },
  { type: "bat", weight: 2, minWave: 5 },
  { type: "spitter", weight: 1, minWave: 6 },
  { type: "exploding", weight: 1, minWave: 7 },
  { type: "leaping", weight: 1, minWave: 8 },
];

export class GameMaster {
  private gameManagers: IGameManagers;

  constructor(gameManagers: IGameManagers) {
    this.gameManagers = gameManagers;
  }

  public getNumberOfZombies(waveNumber: number): ZombieDistribution {
    // Calculate total zombies based on players and wave number
    const playerCount = this.gameManagers.getEntityManager().getPlayerEntities().length;
    const additionalZombiesPerWave =
      BASE_ZOMBIES_PER_WAVE + ZOMBIES_PER_PLAYER_PER_WAVE * playerCount;
    const baseZombies = BASE_ZOMBIES;
    const additionalZombies = (waveNumber - 1) * additionalZombiesPerWave;
    const totalZombies = Math.min(baseZombies + additionalZombies, MAX_TOTAL_ZOMBIES);

    // Filter available zombie types based on current wave
    const availableTypes = ZOMBIE_TYPES.filter((type) => waveNumber >= type.minWave);

    // Normalize weights to ratios based on available types
    const totalWeight = availableTypes.reduce((sum, type) => sum + type.weight, 0);
    const normalizedTypes = availableTypes.map((type) => ({
      ...type,
      ratio: type.weight / totalWeight,
    }));

    // Calculate zombie counts for each type
    const distribution: ZombieDistribution = {
      total: totalZombies,
      regular: 0,
      fast: 0,
      big: 0,
      bat: 0,
      spitter: 0,
    };

    // Calculate base counts using floor
    const counts: Array<{ type: string; count: number; remainder: number }> = [];
    let totalAssigned = 0;

    normalizedTypes.forEach((type) => {
      const count = Math.floor(totalZombies * type.ratio);
      const remainder = totalZombies * type.ratio - count;
      counts.push({ type: type.type, count, remainder });
      totalAssigned += count;
    });

    // Distribute any remainder to ensure exact total
    const remainder = totalZombies - totalAssigned;
    if (remainder > 0) {
      // Sort by remainder (largest first) and distribute the remainder
      counts.sort((a, b) => b.remainder - a.remainder);
      for (let i = 0; i < remainder; i++) {
        counts[i].count++;
      }
    }

    // Assign counts to distribution
    counts.forEach(({ type, count }) => {
      distribution[type as keyof Omit<ZombieDistribution, "total">] = count;
    });

    return distribution;
  }
}
