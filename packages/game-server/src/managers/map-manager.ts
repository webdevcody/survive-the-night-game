import { Tree } from "@/entities/items/tree";
import { Boundary } from "@/entities/environment/boundary";
import { Zombie } from "@/entities/enemies/zombie";
import { DEBUG_START_ZOMBIE } from "@shared/debug";
import { Shotgun } from "@/entities/weapons/shotgun";
import { Pistol } from "@/entities/weapons/pistol";
import { IGameManagers, IEntityManager, IMapManager } from "@/managers/types";
import Positionable from "@/extensions/positionable";
import { TILE_IDS } from "@shared/map";
import { PistolAmmo } from "@/entities/items/pistol-ammo";
import { ShotgunAmmo } from "@/entities/items/shotgun-ammo";
import Vector2 from "@/util/vector2";
import { BigZombie } from "@/entities/enemies/big-zombie";
import { FastZombie } from "@/entities/enemies/fast-zombie";
import { GameMaster } from "./game-master";

const WEAPON_SPAWN_CHANCE = {
  PISTOL: 0.003,
  SHOTGUN: 0.0015,
} as const;

const DIFFICULTY_MULTIPLIER = 1.0;

const BASE_ZOMBIES_PER_PLAYER = 3;
const ADDITIONAL_ZOMBIES_PER_NIGHT = 1;
const MIN_TOTAL_ZOMBIES = 5;
const MAX_TOTAL_ZOMBIES = 50;

const FAST_ZOMBIE_MIN_NIGHT = 3;
const BIG_ZOMBIE_MIN_NIGHT = 5;

const ZOMBIE_TYPE_CHANCE = {
  BIG: 0.1, // 10% chance
  FAST: 0.3, // 20% chance (0.3 - 0.1)
  REGULAR: 1.0, // 70% chance (remaining)
} as const;

const Biomes = {
  CAMPSITE: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0],
    [0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0],
    [0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0],
    [0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0],
    [0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0],
    [0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0],
    [0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0],
  ],
  FOREST: [
    [0, 2, 0, 2, 0, 2, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0],
    [0, 2, 2, 2, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 0, 0],
    [2, 2, 2, 0, 0, 0, 0, 0, 0, 2, 0, 2, 2, 2, 2, 2],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 2, 2],
    [0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0],
    [0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 2, 2, 0],
    [0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0],
    [0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 0],
    [2, 2, 2, 2, 0, 0, 2, 0, 0, 0, 2, 2, 2, 2, 2, 0],
    [2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 2],
  ],
  WATER: [
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  ],
};

const BIOME_SIZE = 16;
const MAP_SIZE = 7;
export const TILE_SIZE = 16;

export class MapManager implements IMapManager {
  private map: number[][] = [];
  private gameManagers?: IGameManagers;
  private entityManager?: IEntityManager;
  private gameMaster?: GameMaster;

  constructor() {}

  public setGameManagers(gameManagers: IGameManagers) {
    this.gameManagers = gameManagers;
    this.entityManager = gameManagers.getEntityManager();
    this.gameMaster = new GameMaster(gameManagers);
  }

  public getGameManagers(): IGameManagers {
    if (!this.gameManagers) {
      throw new Error("MapManager: GameManagers was not set");
    }
    return this.gameManagers;
  }

  public getEntityManager(): IEntityManager {
    if (!this.entityManager) {
      throw new Error("MapManager: EntityManager was not set");
    }
    return this.entityManager;
  }

  public getMap(): number[][] {
    return this.map;
  }

  public spawnZombies(dayNumber: number) {
    if (!this.gameMaster) {
      throw new Error("MapManager: GameMaster was not set");
    }

    const currentZombies = this.countCurrentZombies();
    const zombieDistribution = this.gameMaster.getNumberOfZombies(dayNumber);

    if (currentZombies >= zombieDistribution.total) {
      return;
    }

    const zombiesToSpawn = zombieDistribution.total - currentZombies;
    let spawnedCount = {
      regular: 0,
      fast: 0,
      big: 0,
    };

    const totalSize = BIOME_SIZE * MAP_SIZE;
    const centerBiomeX = Math.floor(MAP_SIZE / 2);
    const centerBiomeY = Math.floor(MAP_SIZE / 2);

    // Keep trying until we spawn all zombies
    let attempts = 0;
    const maxAttempts = zombiesToSpawn * 10; // Prevent infinite loops

    while (
      spawnedCount.regular < zombieDistribution.regular ||
      spawnedCount.fast < zombieDistribution.fast ||
      spawnedCount.big < zombieDistribution.big
    ) {
      if (attempts++ > maxAttempts) break;

      const x = Math.floor(Math.random() * totalSize);
      const y = Math.floor(Math.random() * totalSize);

      // Skip if position is in center campsite biome
      const biomeX = Math.floor(x / BIOME_SIZE);
      const biomeY = Math.floor(y / BIOME_SIZE);
      if (biomeX === centerBiomeX && biomeY === centerBiomeY) {
        continue;
      }

      // Skip if not on grass
      if (this.map[y][x] !== 0) {
        continue;
      }

      // Determine which type of zombie to spawn based on remaining counts
      if (spawnedCount.big < zombieDistribution.big) {
        const zombie = new BigZombie(this.getGameManagers());
        zombie.setPosition(new Vector2(x * TILE_SIZE, y * TILE_SIZE));
        this.getEntityManager().addEntity(zombie);
        spawnedCount.big++;
      } else if (spawnedCount.fast < zombieDistribution.fast) {
        const zombie = new FastZombie(this.getGameManagers());
        zombie.setPosition(new Vector2(x * TILE_SIZE, y * TILE_SIZE));
        this.getEntityManager().addEntity(zombie);
        spawnedCount.fast++;
      } else if (spawnedCount.regular < zombieDistribution.regular) {
        const zombie = new Zombie(this.getGameManagers());
        zombie.setPosition(new Vector2(x * TILE_SIZE, y * TILE_SIZE));
        this.getEntityManager().addEntity(zombie);
        spawnedCount.regular++;
      }
    }
  }

  private countCurrentZombies(): number {
    return this.getEntityManager()
      .getEntities()
      .filter(
        (entity) =>
          entity instanceof Zombie || entity instanceof BigZombie || entity instanceof FastZombie
      ).length;
  }

  generateEmptyMap(width: number, height: number) {
    this.getEntityManager().clear();
    this.getEntityManager().setMapSize(width * TILE_SIZE, height * TILE_SIZE);
    this.map = Array(height)
      .fill(0)
      .map(() => Array(width).fill(0));
  }

  generateMap() {
    this.getEntityManager().clear();
    this.generateSpatialGrid();
    this.initializeMap();
    this.fillMapWithBiomes();
    this.createForestBoundaries();
    this.spawnItems();
    this.spawnDebugZombieIfEnabled();
  }

  private generateSpatialGrid() {
    this.getEntityManager().setMapSize(
      BIOME_SIZE * MAP_SIZE * TILE_SIZE,
      BIOME_SIZE * MAP_SIZE * TILE_SIZE
    );
  }

  private initializeMap() {
    const totalSize = BIOME_SIZE * MAP_SIZE;
    this.map = Array(totalSize)
      .fill(0)
      .map(() => Array(totalSize).fill(0));
  }

  private fillMapWithBiomes() {
    for (let biomeY = 0; biomeY < MAP_SIZE; biomeY++) {
      for (let biomeX = 0; biomeX < MAP_SIZE; biomeX++) {
        this.placeBiome(biomeX, biomeY);
      }
    }
  }

  private createForestBoundaries() {
    const totalSize = BIOME_SIZE * MAP_SIZE;
    for (let y = 0; y < totalSize; y++) {
      for (let x = 0; x < totalSize; x++) {
        if (this.map[y][x] === TILE_IDS.FOREST) {
          const boundary = new Boundary(this.getGameManagers());
          boundary.setPosition(new Vector2(x * TILE_SIZE, y * TILE_SIZE));
          this.getEntityManager().addEntity(boundary);
        }
      }
    }
  }

  private spawnItems() {
    const totalSize = BIOME_SIZE * MAP_SIZE;
    for (let y = 0; y < totalSize; y++) {
      for (let x = 0; x < totalSize; x++) {
        if (this.map[y][x] === 0 || this.map[y][x] === 1) {
          this.trySpawnTreeAt(x, y);
          this.trySpawnWeaponAt(x, y);
        }
      }
    }
  }

  private trySpawnTreeAt(x: number, y: number) {
    if (Math.random() < 0.05) {
      const tree = new Tree(this.getGameManagers());
      tree.getExt(Positionable).setPosition(new Vector2(x * TILE_SIZE, y * TILE_SIZE));
      this.getEntityManager().addEntity(tree);
    }
  }

  private trySpawnWeaponAt(x: number, y: number) {
    if (Math.random() < WEAPON_SPAWN_CHANCE.PISTOL) {
      this.spawnPistolAt(x, y);
    } else if (Math.random() < WEAPON_SPAWN_CHANCE.SHOTGUN) {
      this.spawnShotgunAt(x, y);
    }
  }

  private spawnPistolAt(x: number, y: number) {
    const weapon = new Pistol(this.getGameManagers());
    weapon.getExt(Positionable).setPosition(new Vector2(x * TILE_SIZE, y * TILE_SIZE));
    this.getEntityManager().addEntity(weapon);

    const pistolAmmo = new PistolAmmo(this.getGameManagers());
    pistolAmmo.getExt(Positionable).setPosition(new Vector2(x * TILE_SIZE + 5, y * TILE_SIZE + 4));
    this.getEntityManager().addEntity(pistolAmmo);
  }

  private spawnShotgunAt(x: number, y: number) {
    const weapon = new Shotgun(this.getGameManagers());
    weapon.getExt(Positionable).setPosition(new Vector2(x * TILE_SIZE, y * TILE_SIZE));
    this.getEntityManager().addEntity(weapon);

    const shotgunAmmo = new ShotgunAmmo(this.getGameManagers());
    shotgunAmmo.getExt(Positionable).setPosition(new Vector2(x * TILE_SIZE + 5, y * TILE_SIZE + 4));
    this.getEntityManager().addEntity(shotgunAmmo);
  }

  private spawnDebugZombieIfEnabled() {
    if (DEBUG_START_ZOMBIE) {
      const totalSize = BIOME_SIZE * MAP_SIZE;
      const middleX = Math.floor(totalSize / 2) * TILE_SIZE;
      const middleY = Math.floor(totalSize / 2) * TILE_SIZE;

      const zombie = new Zombie(this.getGameManagers());
      zombie.setPosition(new Vector2(middleX + 16 * 4, middleY));
      this.getEntityManager().addEntity(zombie);
    }
  }

  private placeBiome(biomeX: number, biomeY: number) {
    // Place forest biomes around the edges
    if (biomeX === 0 || biomeX === MAP_SIZE - 1 || biomeY === 0 || biomeY === MAP_SIZE - 1) {
      // Place forest biome
      for (let y = 0; y < BIOME_SIZE; y++) {
        for (let x = 0; x < BIOME_SIZE; x++) {
          const mapY = biomeY * BIOME_SIZE + y;
          const mapX = biomeX * BIOME_SIZE + x;
          this.map[mapY][mapX] = TILE_IDS.FOREST;
        }
      }
      return;
    }

    // Adjust the center position for the campsite (now at 3,3 due to water border)
    const biome =
      biomeX === Math.floor(MAP_SIZE / 2) && biomeY === Math.floor(MAP_SIZE / 2)
        ? Biomes.CAMPSITE
        : Biomes.FOREST;

    for (let y = 0; y < BIOME_SIZE; y++) {
      for (let x = 0; x < BIOME_SIZE; x++) {
        const mapY = biomeY * BIOME_SIZE + y;
        const mapX = biomeX * BIOME_SIZE + x;
        this.map[mapY][mapX] = biome[y][x];
      }
    }
  }

  public getRandomGrassPosition(): Vector2 {
    // Try to get a campsite position first
    const campsitePosition = this.getRandomCampsitePosition();
    if (campsitePosition) {
      return campsitePosition;
    }

    // Fall back to any grass position if campsite position not found
    const totalSize = BIOME_SIZE * MAP_SIZE;
    const validPositions: Vector2[] = [];

    // Collect all valid grass tile positions
    for (let y = 0; y < totalSize; y++) {
      for (let x = 0; x < totalSize; x++) {
        // 0 represents grass tiles
        if (this.map[y][x] === 0) {
          validPositions.push(new Vector2(x * TILE_SIZE, y * TILE_SIZE));
        }
      }
    }

    if (validPositions.length === 0) {
      // Fallback to center if no grass tiles found
      return new Vector2((totalSize * TILE_SIZE) / 2, (totalSize * TILE_SIZE) / 2);
    }

    // Return a random position from valid positions
    const randomIndex = Math.floor(Math.random() * validPositions.length);
    return validPositions[randomIndex];
  }

  private getRandomCampsitePosition(): Vector2 | null {
    const centerBiomeX = Math.floor(MAP_SIZE / 2);
    const centerBiomeY = Math.floor(MAP_SIZE / 2);
    const validPositions: Vector2[] = [];

    // Iterate through the campsite biome tiles
    for (let y = 0; y < BIOME_SIZE; y++) {
      for (let x = 0; x < BIOME_SIZE; x++) {
        const mapY = centerBiomeY * BIOME_SIZE + y;
        const mapX = centerBiomeX * BIOME_SIZE + x;
        // Check if it's a grass tile (0 or 1)
        if (this.map[mapY][mapX] === 0 || this.map[mapY][mapX] === 1) {
          validPositions.push(new Vector2(mapX * TILE_SIZE, mapY * TILE_SIZE));
        }
      }
    }

    if (validPositions.length === 0) {
      return null;
    }

    // Return a random position from valid positions
    const randomIndex = Math.floor(Math.random() * validPositions.length);
    return validPositions[randomIndex];
  }
}
