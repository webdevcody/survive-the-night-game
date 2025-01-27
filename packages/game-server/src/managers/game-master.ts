import { IGameManagers } from "./types";

interface ZombieDistribution {
  total: number;
  regular: number;
  fast: number;
  big: number;
  bat: number;
}

interface ZombieType {
  type: string;
  ratio: number;
  minNight: number;
}

// Constants
const ADDITIONAL_ZOMBIES_PER_NIGHT = 4;
const MIN_TOTAL_ZOMBIES = 10;
const MAX_TOTAL_ZOMBIES = 200;
const BASE_ZOMBIES = 5;

const ZOMBIE_TYPES: ZombieType[] = [
  { type: "regular", ratio: 0.55, minNight: 1 },
  { type: "fast", ratio: 0.2, minNight: 3 },
  { type: "big", ratio: 0.1, minNight: 5 },
  { type: "bat", ratio: 0.15, minNight: 7 },
];

export class GameMaster {
  private gameManagers: IGameManagers;

  constructor(gameManagers: IGameManagers) {
    this.gameManagers = gameManagers;
  }

  public getNumberOfZombies(dayNumber: number): ZombieDistribution {
    // Calculate total zombies based on players and day number
    const baseZombies = BASE_ZOMBIES;
    const additionalZombies = (dayNumber - 1) * ADDITIONAL_ZOMBIES_PER_NIGHT;
    const totalZombies = Math.floor(
      Math.min(Math.max(baseZombies + additionalZombies, MIN_TOTAL_ZOMBIES), MAX_TOTAL_ZOMBIES)
    );

    // Filter available zombie types based on current day
    const availableTypes = ZOMBIE_TYPES.filter((type) => dayNumber >= type.minNight);

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
    };

    normalizedTypes.forEach((type) => {
      const count = Math.floor(totalZombies * type.ratio);
      distribution[type.type as keyof Omit<ZombieDistribution, "total">] = count;
    });

    return distribution;
  }
}
