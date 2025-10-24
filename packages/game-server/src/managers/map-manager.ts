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
import { BatZombie } from "@/entities/enemies/bat-zombie";
import { GameMaster } from "./game-master";
import { Knife } from "@/entities/weapons/knife";
import { Bandage } from "@/entities/items/bandage";
import { Cloth } from "@/entities/items/cloth";
import { Gasoline } from "@/entities/items/gasoline";
import { Grenade } from "@/entities/items/grenade";
import { Landmine } from "@/entities/items/landmine";
import { Spikes } from "@/entities/items/spikes";
import { Torch } from "@/entities/items/torch";
import { Wall } from "@/entities/items/wall";
import { SpitterZombie } from "@/entities/enemies/spitter-zombie";
import { CAMPSITE, FOREST, WATER, type BiomeData } from "@/biomes";
import type { MapData } from "@shared/events/server-sent/map-event";

const WEAPON_SPAWN_CHANCE = {
  // Weapons
  PISTOL: 0.0015,
  SHOTGUN: 0.0015,
  KNIFE: 0.002,
  // ammo
  PISTOL_AMMO: 0.005,
  SHOTGUN_AMMO: 0.005,
  // Items
  BANDAGE: 0.005,
  CLOTH: 0.008,
  GASOLINE: 0.002,
  GRENADE: 0,
  LANDMINE: 0.001,
  SPIKES: 0.003,
  TORCH: 0.003,
  WALL: 0.005,
  TREE: 0.1,
} as const;

const spawnTable = [
  { chance: WEAPON_SPAWN_CHANCE.PISTOL, ItemClass: Pistol },
  { chance: WEAPON_SPAWN_CHANCE.SHOTGUN, ItemClass: Shotgun },
  { chance: WEAPON_SPAWN_CHANCE.KNIFE, ItemClass: Knife },
  { chance: WEAPON_SPAWN_CHANCE.BANDAGE, ItemClass: Bandage },
  { chance: WEAPON_SPAWN_CHANCE.CLOTH, ItemClass: Cloth },
  { chance: WEAPON_SPAWN_CHANCE.GASOLINE, ItemClass: Gasoline },
  { chance: WEAPON_SPAWN_CHANCE.GRENADE, ItemClass: Grenade },
  { chance: WEAPON_SPAWN_CHANCE.LANDMINE, ItemClass: Landmine },
  { chance: WEAPON_SPAWN_CHANCE.SPIKES, ItemClass: Spikes },
  { chance: WEAPON_SPAWN_CHANCE.WALL, ItemClass: Wall },
  { chance: WEAPON_SPAWN_CHANCE.TORCH, ItemClass: Torch },
  { chance: WEAPON_SPAWN_CHANCE.PISTOL_AMMO, ItemClass: PistolAmmo },
  { chance: WEAPON_SPAWN_CHANCE.SHOTGUN_AMMO, ItemClass: ShotgunAmmo },
  { chance: WEAPON_SPAWN_CHANCE.TREE, ItemClass: Tree },
];

const BIOME_SIZE = 16;
const MAP_SIZE = 7;
export const TILE_SIZE = 16;

export class MapManager implements IMapManager {
  private groundLayer: number[][] = [];
  private collidablesLayer: number[][] = [];
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
    // Legacy method - returns ground layer for backward compatibility
    return this.groundLayer;
  }

  public getMapData(): MapData {
    return {
      ground: this.groundLayer,
      collidables: this.collidablesLayer,
    };
  }

  public getGroundLayer(): number[][] {
    return this.groundLayer;
  }

  public getCollidablesLayer(): number[][] {
    return this.collidablesLayer;
  }

  public spawnZombies(dayNumber: number) {
    if (!this.gameMaster) {
      throw new Error("MapManager: GameMaster was not set");
    }

    const zombieDistribution = this.gameMaster.getNumberOfZombies(dayNumber);

    const zombiesToSpawn = zombieDistribution.total;

    console.log("Spawning zombies", zombiesToSpawn);

    let spawnedCount = {
      regular: 0,
      fast: 0,
      big: 0,
      bat: 0,
      spitter: 0,
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
      spawnedCount.big < zombieDistribution.big ||
      spawnedCount.bat < zombieDistribution.bat ||
      spawnedCount.spitter < zombieDistribution.spitter
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

      // Skip if not on valid ground tile (8, 4, 14, 24 are grass/ground tiles)
      // and ensure no collidable is blocking
      const groundTile = this.groundLayer[y]?.[x];
      const isValidGround = groundTile === 8 || groundTile === 4 || groundTile === 14 || groundTile === 24;
      const hasCollidable = this.collidablesLayer[y]?.[x] !== -1;

      if (!isValidGround || hasCollidable) {
        continue;
      }

      // Determine which type of zombie to spawn based on remaining counts
      if (spawnedCount.bat < zombieDistribution.bat) {
        const zombie = new BatZombie(this.getGameManagers());
        zombie.setPosition(new Vector2(x * TILE_SIZE, y * TILE_SIZE));
        this.getEntityManager().addEntity(zombie);
        spawnedCount.bat++;
      } else if (spawnedCount.big < zombieDistribution.big) {
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
      } else if (spawnedCount.spitter < zombieDistribution.spitter) {
        const zombie = new SpitterZombie(this.getGameManagers());
        zombie.setPosition(new Vector2(x * TILE_SIZE, y * TILE_SIZE));
        this.getEntityManager().addEntity(zombie);
        spawnedCount.spitter++;
      }
    }
  }

  generateEmptyMap(width: number, height: number) {
    this.getEntityManager().clear();
    this.getEntityManager().setMapSize(width * TILE_SIZE, height * TILE_SIZE);
    this.groundLayer = Array(height)
      .fill(0)
      .map(() => Array(width).fill(0));
    this.collidablesLayer = Array(height)
      .fill(0)
      .map(() => Array(width).fill(-1));
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
    this.groundLayer = Array(totalSize)
      .fill(0)
      .map(() => Array(totalSize).fill(0));
    this.collidablesLayer = Array(totalSize)
      .fill(0)
      .map(() => Array(totalSize).fill(-1));
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
        // Check collidables layer for any non-empty tile
        const collidableTileId = this.collidablesLayer[y][x];
        if (collidableTileId !== -1) {
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
        // Check ground layer for valid ground tiles (8, 4, 14, 24) and ensure no collidable is blocking
        const groundTile = this.groundLayer[y][x];
        const isValidGround = groundTile === 8 || groundTile === 4 || groundTile === 14 || groundTile === 24;

        if (isValidGround && this.collidablesLayer[y][x] === -1) {
          this.trySpawnItemAt(x, y);
        }
      }
    }
  }

  private trySpawnItemAt(x: number, y: number) {
    const random = Math.random();
    let cumulativeChance = 0;

    for (const { chance, ItemClass } of spawnTable) {
      cumulativeChance += chance;
      if (random < cumulativeChance) {
        const item = new ItemClass(this.getGameManagers());
        item.getExt(Positionable).setPosition(new Vector2(x * TILE_SIZE, y * TILE_SIZE));
        this.getEntityManager().addEntity(item);
        break;
      }
    }
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
    // Place water biomes around the outer edges
    if (biomeX === 0 || biomeX === MAP_SIZE - 1 || biomeY === 0 || biomeY === MAP_SIZE - 1) {
      for (let y = 0; y < BIOME_SIZE; y++) {
        for (let x = 0; x < BIOME_SIZE; x++) {
          const mapY = biomeY * BIOME_SIZE + y;
          const mapX = biomeX * BIOME_SIZE + x;
          this.groundLayer[mapY][mapX] = WATER.ground[y][x];
          this.collidablesLayer[mapY][mapX] = WATER.collidables[y][x];
        }
      }
      return;
    }

    // Place campsite at center (3,3), forest everywhere else
    const biome =
      biomeX === Math.floor(MAP_SIZE / 2) && biomeY === Math.floor(MAP_SIZE / 2)
        ? CAMPSITE
        : FOREST;

    for (let y = 0; y < BIOME_SIZE; y++) {
      for (let x = 0; x < BIOME_SIZE; x++) {
        const mapY = biomeY * BIOME_SIZE + y;
        const mapX = biomeX * BIOME_SIZE + x;
        this.groundLayer[mapY][mapX] = biome.ground[y][x];
        this.collidablesLayer[mapY][mapX] = biome.collidables[y][x];
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

    // Collect all valid ground tile positions (8, 4, 14, 24 are grass/ground tiles)
    for (let y = 0; y < totalSize; y++) {
      for (let x = 0; x < totalSize; x++) {
        const groundTile = this.groundLayer[y][x];
        const isValidGround = groundTile === 8 || groundTile === 4 || groundTile === 14 || groundTile === 24;

        if (isValidGround && this.collidablesLayer[y][x] === -1) {
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
        // Check if it's a valid ground tile (8, 4, 14, 24) and no collidable blocking
        const groundTile = this.groundLayer[mapY][mapX];
        const isValidGround = groundTile === 8 || groundTile === 4 || groundTile === 14 || groundTile === 24;

        if (isValidGround && this.collidablesLayer[mapY][mapX] === -1) {
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
