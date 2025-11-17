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
  ratio: number;
  minWave: number;
}

// Constants
const ADDITIONAL_ZOMBIES_PER_WAVE = 7;
const MAX_TOTAL_ZOMBIES = 200;
const BASE_ZOMBIES = 10;

const ZOMBIE_TYPES: ZombieType[] = [
  { type: "regular", ratio: 0.4, minWave: 1 },
  { type: "fast", ratio: 0.2, minWave: 2 },
  { type: "big", ratio: 0.15, minWave: 3 },
  { type: "bat", ratio: 0.15, minWave: 4 },
  { type: "spitter", ratio: 0.1, minWave: 5 },
  { type: "exploding", ratio: 0.1, minWave: 6 },
  { type: "leaping", ratio: 0.1, minWave: 7 },
];

export class GameMaster {
  private gameManagers: IGameManagers;

  constructor(gameManagers: IGameManagers) {
    this.gameManagers = gameManagers;
  }

  public getNumberOfZombies(waveNumber: number): ZombieDistribution {
    // Calculate total zombies based on players and wave number
    const baseZombies = BASE_ZOMBIES;
    const additionalZombies = (waveNumber - 1) * ADDITIONAL_ZOMBIES_PER_WAVE;
    const totalZombies = Math.min(baseZombies + additionalZombies, MAX_TOTAL_ZOMBIES);

    // Filter available zombie types based on current wave
    const availableTypes = ZOMBIE_TYPES.filter((type) => waveNumber >= type.minWave);

    // Recalculate ratios based on available types
    const totalRatio = availableTypes.reduce((sum, type) => sum + type.ratio, 0);
    const normalizedTypes = availableTypes.map((type) => ({
      ...type,
      ratio: type.ratio / totalRatio,
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

    normalizedTypes.forEach((type) => {
      const count = Math.floor(totalZombies * type.ratio);
      distribution[type.type as keyof Omit<ZombieDistribution, "total">] = count;
    });

    return distribution;
  }
}
